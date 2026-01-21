/**
 * Go Mission - Firebase Cloud Functions (v2)
 * Push Notification System
 */

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

// ============================================
// NOTIFICATION HELPER FUNCTIONS
// ============================================

async function sendToUser(userId, notification) {
  try {
    const userDoc = await db.collection('goMission_members').doc(userId).get();
    if (!userDoc.exists) return { success: false, error: 'User not found' };
    
    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];
    
    if (tokens.length === 0) {
      console.log(`No FCM tokens for user ${userId}`);
      return { success: false, error: 'No tokens' };
    }
    
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      tokens: tokens
    };
    
    const response = await messaging.sendEachForMulticast(message);
    
    // Remove invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
          invalidTokens.push(tokens[idx]);
        }
      });
      
      if (invalidTokens.length > 0) {
        await db.collection('goMission_members').doc(userId).update({
          fcmTokens: FieldValue.arrayRemove(...invalidTokens)
        });
      }
    }
    
    return { success: true, successCount: response.successCount };
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return { success: false, error: error.message };
  }
}

async function sendToUsers(userIds, notification) {
  const results = await Promise.all(
    userIds.map(userId => sendToUser(userId, notification))
  );
  return results;
}

async function sendToGroup(groupId, notification, excludeUserId = null) {
  try {
    const groupDoc = await db.collection('goMission_groups').doc(groupId).get();
    if (!groupDoc.exists) return { success: false, error: 'Group not found' };
    
    const groupData = groupDoc.data();
    let memberIds = groupData.members || [];
    
    if (excludeUserId) {
      memberIds = memberIds.filter(id => id !== excludeUserId);
    }
    
    if (memberIds.length === 0) {
      return { success: true, message: 'No members to notify' };
    }
    
    return await sendToUsers(memberIds, notification);
  } catch (error) {
    console.error('Error sending notification to group:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// FIRESTORE TRIGGERS
// ============================================

// New chat message
exports.onNewChatMessage = onDocumentCreated('goMission_chats/{messageId}', async (event) => {
  const message = event.data.data();
  const { groupId, senderId, senderName, text, type } = message;
  
  if (type === 'system') return null;
  
  const groupDoc = await db.collection('goMission_groups').doc(groupId).get();
  const groupName = groupDoc.exists ? groupDoc.data().name : 'Your Group';
  
  let body = text;
  if (type === 'devotion') {
    body = `${senderName} shared a reflection`;
  }
  
  const notification = {
    title: `💬 ${groupName}`,
    body: `${senderName}: ${body?.substring(0, 100) || ''}`,
    data: {
      type: 'chat',
      groupId: groupId,
      messageId: event.params.messageId
    }
  };
  
  await sendToGroup(groupId, notification, senderId);
  return null;
});

// Group join request
exports.onJoinRequest = onDocumentUpdated('goMission_groups/{groupId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  
  const oldRequests = before.joinRequests || [];
  const newRequests = after.joinRequests || [];
  
  if (newRequests.length > oldRequests.length) {
    const newRequest = newRequests.find(r => !oldRequests.some(o => o.odId === r.odId));
    
    if (newRequest && after.leaderId) {
      const notification = {
        title: '👋 New Join Request',
        body: `${newRequest.name} wants to join ${after.name}`,
        data: {
          type: 'join_request',
          groupId: event.params.groupId
        }
      };
      
      await sendToUser(after.leaderId, notification);
    }
  }
  
  return null;
});

// Devotion shared
exports.onDevotionShared = onDocumentCreated('goMission_devotions/{devotionId}', async (event) => {
  const devotion = event.data.data();
  
  if (!devotion.sharedWithGroup || !devotion.groupId) return null;
  
  const notification = {
    title: '🔥 Shared Reflection',
    body: `${devotion.userName} shared their reflection on ${devotion.book} ${devotion.chapter}`,
    data: {
      type: 'devotion',
      devotionId: event.params.devotionId
    }
  };
  
  await sendToGroup(devotion.groupId, notification, devotion.uid);
  return null;
});

// ============================================
// CALLABLE FUNCTIONS
// ============================================

exports.sendCustomNotification = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { targetType, targetId, title, body, notificationType } = request.data;
  
  const userDoc = await db.collection('goMission_members').doc(request.auth.uid).get();
  const userData = userDoc.data();
  
  if (!userData?.roles?.isGroupLeader && !userData?.roles?.isAdmin) {
    throw new HttpsError('permission-denied', 'Must be a leader or admin');
  }
  
  const notification = {
    title,
    body,
    data: {
      type: notificationType || 'announcement',
      senderId: request.auth.uid
    }
  };
  
  let result;
  if (targetType === 'user') {
    result = await sendToUser(targetId, notification);
  } else if (targetType === 'group') {
    result = await sendToGroup(targetId, notification, request.auth.uid);
  } else {
    throw new HttpsError('invalid-argument', 'Invalid target type');
  }
  
  return result;
});

exports.registerToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { token } = request.data;
  if (!token) {
    throw new HttpsError('invalid-argument', 'Token required');
  }
  
  await db.collection('goMission_members').doc(request.auth.uid).update({
    fcmTokens: FieldValue.arrayUnion(token)
  });
  
  return { success: true };
});

exports.unregisterToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { token } = request.data;
  if (!token) {
    throw new HttpsError('invalid-argument', 'Token required');
  }
  
  await db.collection('goMission_members').doc(request.auth.uid).update({
    fcmTokens: FieldValue.arrayRemove(token)
  });
  
  return { success: true };
});

// Daily reminder - 6 AM Manila time
exports.sendDailyReminder = onSchedule({
  schedule: '0 6 * * *',
  timeZone: 'Asia/Manila',
}, async (event) => {
  const usersSnapshot = await db.collection('goMission_members')
    .where('settings.dailyReminder', '==', true)
    .get();
  
  if (usersSnapshot.empty) return null;
  
  const notification = {
    title: '🌅 Good Morning!',
    body: 'Start your day with God. Your daily reading awaits.',
    data: { type: 'daily_reminder' }
  };
  
  const userIds = usersSnapshot.docs.map(doc => doc.id);
  await sendToUsers(userIds, notification);
  
  return null;
});
