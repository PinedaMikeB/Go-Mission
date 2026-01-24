/**
 * Go Mission - Firebase Cloud Functions (v2)
 * Push Notification System with Badge Support
 * Password Reset with Email Verification Codes
 */

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getAuth } = require('firebase-admin/auth');
const nodemailer = require('nodemailer');

initializeApp();

const db = getFirestore();
const messaging = getMessaging();
const adminAuth = getAuth();

// ============================================
// EMAIL CONFIGURATION (using Firebase Secrets)
// ============================================
// To set up Gmail App Password:
// 1. Enable 2FA on your Google account
// 2. Go to https://myaccount.google.com/apppasswords
// 3. Create an app password for "Mail"
// 4. Run: firebase functions:secrets:set GMAIL_EMAIL
// 5. Run: firebase functions:secrets:set GMAIL_PASSWORD

const gmailEmail = defineSecret('GMAIL_EMAIL');
const gmailPassword = defineSecret('GMAIL_PASSWORD');

/**
 * Send email using nodemailer
 */
async function sendEmailWithCredentials(to, subject, html, email, password) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: password
    }
  });
  
  const mailOptions = {
    from: `"Go Mission" <${email}>`,
    to: to,
    subject: subject,
    html: html
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// ============================================
// NOTIFICATION HELPER FUNCTIONS
// ============================================

async function getUnreadCount(userId) {
  try {
    const userDoc = await db.collection('goMission_members').doc(userId).get();
    if (!userDoc.exists) return 0;
    return userDoc.data().unreadCount || 0;
  } catch (error) {
    return 0;
  }
}

async function incrementUnreadCount(userId) {
  try {
    await db.collection('goMission_members').doc(userId).update({
      unreadCount: FieldValue.increment(1)
    });
  } catch (error) {
    console.error('Error incrementing unread count:', error);
  }
}

async function sendToUser(userId, notification) {
  try {
    const userDoc = await db.collection('goMission_members').doc(userId).get();
    if (!userDoc.exists) return { success: false, error: 'User not found' };
    
    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];
    
    if (tokens.length === 0) {
      return { success: false, error: 'No tokens' };
    }
    
    await incrementUnreadCount(userId);
    const badgeCount = (userData.unreadCount || 0) + 1;
    
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        notification: {
          channelId: 'default',
          notificationCount: badgeCount,
          color: '#f59e0b'
        }
      },
      apns: {
        payload: {
          aps: {
            badge: badgeCount,
            sound: 'default'
          }
        }
      },
      webpush: {
        notification: {
          badge: '/icons/icon-192.png',
          icon: '/icons/icon-192.png',
          vibrate: [100, 50, 100]
        }
      },
      tokens: tokens
    };
    
    const response = await messaging.sendEachForMulticast(message);
    
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (code === 'messaging/invalid-registration-token' || 
              code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
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
    return { success: false, error: error.message };
  }
}

async function sendToUsers(userIds, notification) {
  return Promise.all(userIds.map(id => sendToUser(id, notification)));
}

async function sendToGroup(groupId, notification, excludeUserId = null) {
  try {
    const groupDoc = await db.collection('goMission_groups').doc(groupId).get();
    if (!groupDoc.exists) return { success: false, error: 'Group not found' };
    
    let memberIds = groupDoc.data().members || [];
    if (excludeUserId) {
      memberIds = memberIds.filter(id => id !== excludeUserId);
    }
    
    if (memberIds.length === 0) {
      return { success: true, message: 'No members to notify' };
    }
    
    // Filter out users who have this chat open (activeChat === groupId)
    const membersToNotify = [];
    for (const memberId of memberIds) {
      const memberDoc = await db.collection('goMission_members').doc(memberId).get();
      if (memberDoc.exists) {
        const memberData = memberDoc.data();
        // Skip if user has this chat open
        if (memberData.activeChat === groupId) {
          console.log(`Skipping notification for ${memberId} - chat is open`);
          continue;
        }
        membersToNotify.push(memberId);
      }
    }
    
    if (membersToNotify.length === 0) {
      return { success: true, message: 'All members have chat open' };
    }
    
    return await sendToUsers(membersToNotify, notification);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================
// FIRESTORE TRIGGERS
// ============================================

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

exports.onMemberJoined = onDocumentUpdated('goMission_groups/{groupId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  
  const oldMembers = before.members || [];
  const newMembers = after.members || [];
  
  // New member joined
  if (newMembers.length > oldMembers.length) {
    const newMemberId = newMembers.find(id => !oldMembers.includes(id));
    
    if (newMemberId) {
      const newMemberDoc = await db.collection('goMission_members').doc(newMemberId).get();
      const newMemberName = newMemberDoc.exists ? newMemberDoc.data().displayName : 'Someone';
      
      const notification = {
        title: `👋 New Member!`,
        body: `${newMemberName} joined ${after.name}`,
        data: {
          type: 'member_joined',
          groupId: event.params.groupId,
          memberId: newMemberId
        }
      };
      
      const existingMembers = oldMembers.filter(id => id !== newMemberId);
      if (existingMembers.length > 0) {
        await sendToUsers(existingMembers, notification);
      }
    }
  }
  
  // Join request
  const oldRequests = before.joinRequests || [];
  const newRequests = after.joinRequests || [];
  
  if (newRequests.length > oldRequests.length) {
    const newRequest = newRequests.find(r => !oldRequests.some(o => o.odId === r.odId));
    
    if (newRequest && after.leaderId) {
      const notification = {
        title: '🔔 New Join Request',
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

exports.onDevotionShared = onDocumentCreated('goMission_devotions/{devotionId}', async (event) => {
  const devotion = event.data.data();
  
  if (!devotion.sharedWithGroup || !devotion.groupId) return null;
  
  const notification = {
    title: '🔥 Shared Reflection',
    body: `${devotion.userName} shared their reflection on ${devotion.book} ${devotion.chapter}`,
    data: {
      type: 'devotion',
      devotionId: event.params.devotionId,
      groupId: devotion.groupId
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

exports.clearBadge = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }
  
  await db.collection('goMission_members').doc(request.auth.uid).update({
    unreadCount: 0
  });
  
  return { success: true };
});

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

// ============================================
// PASSWORD RESET WITH EMAIL CODE
// ============================================

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send password reset code to user's email
 * Stores code in Firestore with 15-minute expiry
 */
exports.sendPasswordResetCode = onCall({ secrets: [gmailEmail, gmailPassword] }, async (request) => {
  const { email } = request.data;
  
  if (!email) {
    throw new HttpsError('invalid-argument', 'Email is required');
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if user exists in Firebase Auth
  let userRecord;
  try {
    userRecord = await adminAuth.getUserByEmail(normalizedEmail);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Don't reveal if email exists or not for security
      // But return success anyway to prevent email enumeration
      return { success: true, message: 'If an account exists, a code has been sent.' };
    }
    throw new HttpsError('internal', 'Error checking user');
  }
  
  // Generate 6-digit code
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  
  // Store code in Firestore
  await db.collection('goMission_passwordResets').doc(normalizedEmail).set({
    code: code,
    email: normalizedEmail,
    uid: userRecord.uid,
    expiresAt: expiresAt,
    attempts: 0,
    createdAt: FieldValue.serverTimestamp()
  });
  
  // Send email with verification code
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #1a0505; color: #ffffff; padding: 40px 20px; margin: 0;">
      <div style="max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #2a0a0a 0%, #1a0505 100%); border-radius: 16px; padding: 40px; border: 1px solid #3d1515;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; font-size: 24px; margin: 0; letter-spacing: 3px;">★ GO MISSION ★</h1>
        </div>
        
        <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 20px; text-align: center;">Password Reset Code</h2>
        
        <p style="color: #a8a29e; font-size: 14px; line-height: 1.6; margin-bottom: 30px; text-align: center;">
          You requested to reset your password. Use this verification code:
        </p>
        
        <div style="background: #3d1515; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f59e0b;">${code}</span>
        </div>
        
        <p style="color: #78716c; font-size: 12px; text-align: center; margin-bottom: 20px;">
          This code expires in <strong style="color: #f59e0b;">15 minutes</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #3d1515; margin: 30px 0;">
        
        <p style="color: #57534e; font-size: 11px; text-align: center; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email.<br>
          Your password will not be changed.
        </p>
      </div>
    </body>
    </html>
  `;
  
  // Try to send email using secrets
  const emailSent = await sendEmailWithCredentials(
    normalizedEmail,
    '🔐 Go Mission - Password Reset Code',
    emailHtml,
    gmailEmail.value(),
    gmailPassword.value()
  );
  
  // Log for debugging
  console.log(`Password reset code for ${normalizedEmail}: ${code} (email sent: ${emailSent})`);
  
  return { 
    success: true, 
    message: 'Verification code sent to your email.',
    emailSent: emailSent
  };
});

/**
 * Verify the password reset code
 */
exports.verifyPasswordResetCode = onCall(async (request) => {
  const { email, code } = request.data;
  
  if (!email || !code) {
    throw new HttpsError('invalid-argument', 'Email and code are required');
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Get the reset document
  const resetDoc = await db.collection('goMission_passwordResets').doc(normalizedEmail).get();
  
  if (!resetDoc.exists) {
    throw new HttpsError('not-found', 'No reset code found. Please request a new one.');
  }
  
  const resetData = resetDoc.data();
  
  // Check if expired
  if (resetData.expiresAt.toDate() < new Date()) {
    await db.collection('goMission_passwordResets').doc(normalizedEmail).delete();
    throw new HttpsError('deadline-exceeded', 'Code has expired. Please request a new one.');
  }
  
  // Check attempts (max 5)
  if (resetData.attempts >= 5) {
    await db.collection('goMission_passwordResets').doc(normalizedEmail).delete();
    throw new HttpsError('resource-exhausted', 'Too many attempts. Please request a new code.');
  }
  
  // Increment attempts
  await db.collection('goMission_passwordResets').doc(normalizedEmail).update({
    attempts: FieldValue.increment(1)
  });
  
  // Verify code
  if (resetData.code !== code) {
    throw new HttpsError('permission-denied', 'Invalid code. Please try again.');
  }
  
  // Code is valid! Generate a temporary token for password reset
  // Mark as verified
  await db.collection('goMission_passwordResets').doc(normalizedEmail).update({
    verified: true,
    verifiedAt: FieldValue.serverTimestamp()
  });
  
  return { 
    success: true, 
    message: 'Code verified successfully.',
    uid: resetData.uid
  };
});

/**
 * Complete password reset after code verification
 */
exports.completePasswordReset = onCall(async (request) => {
  const { email, code, newPassword } = request.data;
  
  if (!email || !code || !newPassword) {
    throw new HttpsError('invalid-argument', 'Email, code, and new password are required');
  }
  
  if (newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters');
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Get the reset document
  const resetDoc = await db.collection('goMission_passwordResets').doc(normalizedEmail).get();
  
  if (!resetDoc.exists) {
    throw new HttpsError('not-found', 'No reset session found. Please start over.');
  }
  
  const resetData = resetDoc.data();
  
  // Check if verified
  if (!resetData.verified) {
    throw new HttpsError('failed-precondition', 'Code not verified. Please verify first.');
  }
  
  // Check if still valid (give 5 more minutes after verification)
  const verifiedAt = resetData.verifiedAt?.toDate() || new Date(0);
  if (new Date() - verifiedAt > 5 * 60 * 1000) {
    await db.collection('goMission_passwordResets').doc(normalizedEmail).delete();
    throw new HttpsError('deadline-exceeded', 'Session expired. Please start over.');
  }
  
  // Verify code one more time
  if (resetData.code !== code) {
    throw new HttpsError('permission-denied', 'Invalid code.');
  }
  
  // Update password using Admin SDK
  try {
    await adminAuth.updateUser(resetData.uid, {
      password: newPassword
    });
  } catch (error) {
    console.error('Error updating password:', error);
    throw new HttpsError('internal', 'Failed to update password. Please try again.');
  }
  
  // Clean up reset document
  await db.collection('goMission_passwordResets').doc(normalizedEmail).delete();
  
  return { 
    success: true, 
    message: 'Password updated successfully. You can now sign in.'
  };
});

/**
 * Clean up expired password reset codes (runs daily)
 */
exports.cleanupExpiredResetCodes = onSchedule({
  schedule: '0 0 * * *', // Daily at midnight
  timeZone: 'Asia/Manila',
}, async (event) => {
  const now = new Date();
  
  const expiredDocs = await db.collection('goMission_passwordResets')
    .where('expiresAt', '<', now)
    .get();
  
  const batch = db.batch();
  expiredDocs.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Cleaned up ${expiredDocs.size} expired password reset codes`);
  
  return null;
});
