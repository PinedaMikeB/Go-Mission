/**
 * Go Mission - Firebase Cloud Functions
 * Push Notification System
 * 
 * This module handles sending push notifications for various activities:
 * - Group chat messages
 * - Shared devotions
 * - Group join requests
 * - Training reminders
 * - Daily devotion reminders
 * - Leader announcements
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// ============================================
// NOTIFICATION HELPER FUNCTIONS
// ============================================

/**
 * Send push notification to a single user
 * @param {string} userId - User ID to send notification to
 * @param {object} notification - { title, body, icon, data }
 */
async function sendToUser(userId, notification) {
  try {
    // Get user's FCM tokens
    const userDoc = await db.collection('goMission_members').doc(userId).get();
    if (!userDoc.exists) return { success: false, error: 'User not found' };
    
    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];
    
    if (tokens.length === 0) {
      console.log(`No FCM tokens for user ${userId}`);
      return { success: false, error: 'No tokens' };
    }
    
    // Send to all user's devices
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192.png'
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
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
        });
      }
    }
    
    return { success: true, successCount: response.successCount };
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {object} notification - { title, body, icon, data }
 */
async function sendToUsers(userIds, notification) {
  const results = await Promise.all(
    userIds.map(userId => sendToUser(userId, notification))
  );
  return results;
}

/**
 * Send push notification to all members of a group
 * @param {string} groupId - Group ID
 * @param {object} notification - { title, body, icon, data }
 * @param {string} excludeUserId - Optional user ID to exclude (e.g., sender)
 */
async function sendToGroup(groupId, notification, excludeUserId = null) {
  try {
    const groupDoc = await db.collection('goMission_groups').doc(groupId).get();
    if (!groupDoc.exists) return { success: false, error: 'Group not found' };
    
    const groupData = groupDoc.data();
    let memberIds = groupData.members || [];
    
    // Exclude the sender
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
// FIRESTORE TRIGGERS - AUTO NOTIFICATIONS
// ============================================

/**
 * Trigger: New chat message
 * Notify all group members (except sender)
 */
exports.onNewChatMessage = functions.firestore
  .document('goMission_chats/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { groupId, senderId, senderName, text, type } = message;
    
    // Don't notify for system messages
    if (type === 'system') return null;
    
    // Get group name
    const groupDoc = await db.collection('goMission_groups').doc(groupId).get();
    const groupName = groupDoc.exists ? groupDoc.data().name : 'Your Group';
    
    let body = text;
    if (type === 'devotion') {
      body = `${senderName} shared a reflection`;
    }
    
    const notification = {
      title: `💬 ${groupName}`,
      body: `${senderName}: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`,
      data: {
        type: 'chat',
        groupId: groupId,
        messageId: context.params.messageId,
        click_action: 'OPEN_CHAT'
      }
    };
    
    await sendToGroup(groupId, notification, senderId);
    return null;
  });

/**
 * Trigger: Group join request
 * Notify group leader
 */
exports.onJoinRequest = functions.firestore
  .document('goMission_groups/{groupId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    const oldRequests = before.joinRequests || [];
    const newRequests = after.joinRequests || [];
    
    // Check if new request was added
    if (newRequests.length > oldRequests.length) {
      const newRequest = newRequests.find(r => !oldRequests.some(o => o.odId === r.odId));
      
      if (newRequest && after.leaderId) {
        const notification = {
          title: '👋 New Join Request',
          body: `${newRequest.name} wants to join ${after.name}`,
          data: {
            type: 'join_request',
            groupId: context.params.groupId,
            click_action: 'OPEN_GROUP'
          }
        };
        
        await sendToUser(after.leaderId, notification);
      }
    }
    
    return null;
  });

/**
 * Trigger: Devotion shared to group
 * Notify group members when someone shares their devotion
 */
exports.onDevotionShared = functions.firestore
  .document('goMission_devotions/{devotionId}')
  .onCreate(async (snap, context) => {
    const devotion = snap.data();
    
    // Only notify if shared with group
    if (!devotion.sharedWithGroup || !devotion.groupId) return null;
    
    const notification = {
      title: '🔥 Shared Reflection',
      body: `${devotion.userName} shared their reflection on ${devotion.book} ${devotion.chapter}`,
      data: {
        type: 'devotion',
        devotionId: context.params.devotionId,
        click_action: 'OPEN_CHAT'
      }
    };
    
    await sendToGroup(devotion.groupId, notification, devotion.odId);
    return null;
  });

// ============================================
// CALLABLE FUNCTIONS - MANUAL NOTIFICATIONS
// ============================================

/**
 * Send custom notification (for leaders/admins)
 * Can be called from the app
 */
exports.sendCustomNotification = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { targetType, targetId, title, body, notificationType } = data;
  
  // Verify user has permission (is leader or admin)
  const userDoc = await db.collection('goMission_members').doc(context.auth.uid).get();
  const userData = userDoc.data();
  
  if (!userData.roles?.isGroupLeader && !userData.roles?.isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be a leader or admin');
  }
  
  const notification = {
    title,
    body,
    data: {
      type: notificationType || 'announcement',
      senderId: context.auth.uid
    }
  };
  
  let result;
  if (targetType === 'user') {
    result = await sendToUser(targetId, notification);
  } else if (targetType === 'group') {
    result = await sendToGroup(targetId, notification, context.auth.uid);
  } else {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid target type');
  }
  
  return result;
});

/**
 * Send daily devotion reminder
 * Scheduled to run every day at 6 AM
 */
exports.sendDailyReminder = functions.pubsub
  .schedule('0 6 * * *')
  .timeZone('Asia/Manila')
  .onRun(async (context) => {
    // Get all users who want daily reminders
    const usersSnapshot = await db.collection('goMission_members')
      .where('settings.dailyReminder', '==', true)
      .get();
    
    if (usersSnapshot.empty) return null;
    
    const notification = {
      title: '🌅 Good Morning!',
      body: 'Start your day with God. Your daily reading awaits.',
      data: {
        type: 'daily_reminder',
        click_action: 'OPEN_DEVOTION'
      }
    };
    
    const userIds = usersSnapshot.docs.map(doc => doc.id);
    await sendToUsers(userIds, notification);
    
    return null;
  });

/**
 * Send training reminder
 * Notify users about upcoming training sessions
 */
exports.sendTrainingReminder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { sessionId, groupId, title, scheduledTime } = data;
  
  const notification = {
    title: '🎯 Training Reminder',
    body: `${title} starts soon! Don't miss it.`,
    data: {
      type: 'training_reminder',
      sessionId,
      click_action: 'OPEN_TRAINING'
    }
  };
  
  await sendToGroup(groupId, notification);
  return { success: true };
});

// ============================================
// TOKEN MANAGEMENT
// ============================================

/**
 * Register FCM token for a user
 */
exports.registerToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { token } = data;
  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'Token required');
  }
  
  // Add token to user's tokens array (avoid duplicates)
  await db.collection('goMission_members').doc(context.auth.uid).update({
    fcmTokens: admin.firestore.FieldValue.arrayUnion(token)
  });
  
  return { success: true };
});

/**
 * Unregister FCM token (e.g., on logout)
 */
exports.unregisterToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { token } = data;
  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'Token required');
  }
  
  await db.collection('goMission_members').doc(context.auth.uid).update({
    fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
  });
  
  return { success: true };
});
