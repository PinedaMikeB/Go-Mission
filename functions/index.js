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
const ADMIN_UID_ALLOWLIST = new Set([
  '9zVKHJ11zaXD0f4GI6P7LHD6re32'
]);
const ADMIN_EMAIL_ALLOWLIST = new Set([
  'michael.marga@gmail.com',
  'vasquezperlie18@gmail.com'
]);

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

const APP_BASE_URL = 'https://gomission.netlify.app';
const ACTIVE_CONTEXT_TTL_MS = 10 * 60 * 1000;

function normalizeNotificationData(data = {}, title = '', body = '') {
  const normalized = {};
  Object.entries((data && typeof data === 'object') ? data : {}).forEach(([key, value]) => {
    if (!key || value === undefined || value === null) return;
    normalized[key] = String(value);
  });
  if (title) normalized.notificationTitle = String(title);
  if (body) normalized.notificationBody = String(body);
  return normalized;
}

function buildNotificationDeepLink(data = {}, title = '', body = '') {
  const payload = (data && typeof data === 'object') ? data : {};
  const type = String(payload.type || '').toLowerCase();

  if ((type === 'chat' || type === 'chat_mention') && payload.groupId) {
    const params = new URLSearchParams({ openChat: String(payload.groupId) });
    if (payload.messageId) params.set('openChatMessage', String(payload.messageId));
    return `${APP_BASE_URL}/?${params.toString()}`;
  }

  if (type === 'dm' && payload.senderId) {
    const params = new URLSearchParams({
      openMessages: 'direct',
      openDmWith: String(payload.senderId)
    });
    return `${APP_BASE_URL}/?${params.toString()}`;
  }

  if (type === 'devotion') {
    return `${APP_BASE_URL}/?openDevotion=true`;
  }

  if (type === 'announcement' || (!type && (title || body))) {
    const params = new URLSearchParams({
      openAnnouncement: '1',
      openMessages: 'groups'
    });
    if (title) params.set('announcementTitle', truncateText(String(title), 180));
    if (body) params.set('announcementBody', truncateText(String(body), 2000));
    if (payload.announcementId) params.set('announcementId', String(payload.announcementId));
    return `${APP_BASE_URL}/?${params.toString()}`;
  }

  return `${APP_BASE_URL}/`;
}

async function sendToUser(userId, notification) {
  try {
    const userDoc = await db.collection('goMission_members').doc(userId).get();
    if (!userDoc.exists) return { success: false, error: 'User not found' };
    
    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];

    await incrementUnreadCount(userId);
    const badgeCount = (userData.unreadCount || 0) + 1;
    
    if (tokens.length === 0) {
      return { success: false, error: 'No tokens', badgeCount };
    }

    const normalizedData = normalizeNotificationData(
      notification.data || {},
      notification.title,
      notification.body
    );
    const deepLink = buildNotificationDeepLink(
      normalizedData,
      notification.title,
      notification.body
    );
    
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: normalizedData,
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
        },
        fcmOptions: {
          link: deepLink
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

function uniqueUserIds(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim()))];
}

function collectMentionedUserIds(message = {}) {
  const fromArray = [];
  if (Array.isArray(message.mentionedUserIds)) {
    fromArray.push(...message.mentionedUserIds);
  }
  if (Array.isArray(message.mentions)) {
    message.mentions.forEach((entry) => {
      if (typeof entry === 'string') fromArray.push(entry);
      else if (entry && typeof entry.uid === 'string') fromArray.push(entry.uid);
    });
  }
  return uniqueUserIds(fromArray);
}

function getGroupParticipantIds(groupData = {}) {
  const members = Array.isArray(groupData.members) ? groupData.members : [];
  const guestIds = (Array.isArray(groupData.guests) ? groupData.guests : [])
    .map((guest) => guest?.odId)
    .filter(Boolean);
  return uniqueUserIds([...members, ...guestIds]);
}

function toDateOrNull(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date?.getTime?.()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function truncateText(value, maxLength = 120) {
  const str = String(value || '');
  if (str.length <= maxLength) return str;
  return `${str.slice(0, Math.max(1, maxLength - 1))}…`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function filterRecipientsByActiveContext(userIds = [], contextField, contextValue, options = {}) {
  const uniqueIds = uniqueUserIds(userIds);
  if (!uniqueIds.length) return [];
  if (!contextField) return uniqueIds;
  const timestampField = typeof options.timestampField === 'string' ? options.timestampField : '';
  const ttlMs = Number.isFinite(options.ttlMs) && options.ttlMs > 0
    ? Number(options.ttlMs)
    : ACTIVE_CONTEXT_TTL_MS;

  const recipients = [];
  for (const userId of uniqueIds) {
    try {
      const userDoc = await db.collection('goMission_members').doc(userId).get();
      if (!userDoc.exists) continue;
      const data = userDoc.data() || {};
      if (data[contextField] !== contextValue) {
        recipients.push(userId);
        continue;
      }

      // If context is stale, treat as inactive and deliver notification.
      if (timestampField) {
        const activeAt = toDateOrNull(data[timestampField]);
        const isFresh = activeAt && ((Date.now() - activeAt.getTime()) <= ttlMs);
        if (!isFresh) {
          recipients.push(userId);
          continue;
        }
      } else {
        continue;
      }
    } catch (error) {
      console.warn(`[Notifications] Could not evaluate active context for ${userId}:`, error);
      recipients.push(userId);
    }
  }
  return recipients;
}

function normalizeRequest(request) {
  if (!request || typeof request !== 'object') return null;
  const requesterId = request.odId || request.uid || null;
  if (!requesterId) return null;
  return {
    ...request,
    requesterId,
    name: request.name || request.displayName || 'Someone'
  };
}

function collectRequests(groupData) {
  const joinRequests = Array.isArray(groupData?.joinRequests) ? groupData.joinRequests : [];
  const pendingRequests = Array.isArray(groupData?.pendingRequests) ? groupData.pendingRequests : [];
  const merged = [...joinRequests, ...pendingRequests];

  const out = [];
  const seen = new Set();
  for (const request of merged) {
    const normalized = normalizeRequest(request);
    if (!normalized || seen.has(normalized.requesterId)) continue;
    seen.add(normalized.requesterId);
    out.push(normalized);
  }
  return out;
}

async function sendEventEmailToUser(userId, subject, html) {
  try {
    if (!userId) return false;
    const userDoc = await db.collection('goMission_members').doc(userId).get();
    if (!userDoc.exists) return false;

    const to = userDoc.data()?.email;
    if (!to) return false;

    const fromEmail = gmailEmail.value();
    const fromPassword = gmailPassword.value();
    if (!fromEmail || !fromPassword) return false;

    return await sendEmailWithCredentials(to, subject, html, fromEmail, fromPassword);
  } catch (error) {
    console.error('[Notifications] Email send error:', error);
    return false;
  }
}

// ============================================
// FIRESTORE TRIGGERS
// ============================================

exports.onNewChatMessage = onDocumentCreated({
  document: 'goMission_chats/{messageId}',
  secrets: [gmailEmail, gmailPassword]
}, async (event) => {
  const message = event.data?.data() || {};
  const { groupId, senderId, senderName, text, type } = message;
  if (!groupId || !senderId) return null;
  if (type === 'system') return null;

  const groupDoc = await db.collection('goMission_groups').doc(groupId).get();
  const groupData = groupDoc.exists ? (groupDoc.data() || {}) : {};
  const groupName = groupData.name || 'Your Group';
  const senderLabel = senderName || 'Someone';

  const baseBody = type === 'devotion'
    ? `${senderLabel} shared a reflection`
    : `${senderLabel}: ${truncateText(text, 100) || 'New message'}`;

  const participantIds = getGroupParticipantIds(groupData).filter((id) => id !== senderId);
  if (!participantIds.length) return null;

  const mentionedIds = collectMentionedUserIds(message)
    .filter((id) => id !== senderId && participantIds.includes(id));

  const mentionRecipients = await filterRecipientsByActiveContext(mentionedIds, 'activeChat', groupId, {
    timestampField: 'activeChatUpdatedAt',
    ttlMs: ACTIVE_CONTEXT_TTL_MS
  });
  if (mentionRecipients.length) {
    const mentionNotification = {
      title: `📣 Mention in ${groupName}`,
      body: `${senderLabel} mentioned you: ${truncateText(text, 100) || 'Open chat to reply.'}`,
      data: {
        type: 'chat_mention',
        groupId,
        messageId: event.params.messageId,
        senderId
      }
    };
    await sendToUsers(mentionRecipients, mentionNotification);

    const mentionEmailHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 12px">📣 You were mentioned in ${escapeHtml(groupName)}</h2>
        <p><strong>${escapeHtml(senderLabel)}</strong> mentioned you in group chat.</p>
        <p style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">${escapeHtml(truncateText(text, 280) || 'Open Go Mission to view the message.')}</p>
      </div>
    `;
    await Promise.all(mentionRecipients.map((userId) => (
      sendEventEmailToUser(
        userId,
        `${senderLabel} mentioned you in ${groupName}`,
        mentionEmailHtml
      )
    )));
  }

  const regularRecipients = participantIds.filter((id) => !mentionedIds.includes(id));
  const regularRecipientsFiltered = await filterRecipientsByActiveContext(regularRecipients, 'activeChat', groupId, {
    timestampField: 'activeChatUpdatedAt',
    ttlMs: ACTIVE_CONTEXT_TTL_MS
  });
  if (regularRecipientsFiltered.length) {
    const notification = {
      title: `💬 ${groupName}`,
      body: baseBody,
      data: {
        type: 'chat',
        groupId,
        messageId: event.params.messageId,
        senderId
      }
    };
    await sendToUsers(regularRecipientsFiltered, notification);
  }

  return null;
});

exports.onNewDirectMessage = onDocumentCreated({
  document: 'goMission_dmMessages/{messageId}',
  secrets: [gmailEmail, gmailPassword]
}, async (event) => {
  const message = event.data?.data() || {};
  const senderId = message.senderId;
  const senderName = message.senderName || 'Someone';
  const threadId = message.threadId;
  const participants = uniqueUserIds(message.participants || []);
  if (!senderId || !threadId || !participants.length) return null;
  if (message.type === 'system') return null;

  const recipientIds = participants.filter((id) => id !== senderId);
  if (!recipientIds.length) return null;

  const recipients = await filterRecipientsByActiveContext(recipientIds, 'activeDmThread', threadId, {
    timestampField: 'activeDmThreadUpdatedAt',
    ttlMs: ACTIVE_CONTEXT_TTL_MS
  });
  if (!recipients.length) return null;

  const body = truncateText(message.text || 'Sent you a message.', 110);
  const notification = {
    title: `💬 ${senderName}`,
    body,
    data: {
      type: 'dm',
      threadId,
      senderId,
      messageId: event.params.messageId
    }
  };

  await sendToUsers(recipients, notification);

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2 style="margin:0 0 12px">💬 New direct message</h2>
      <p><strong>${escapeHtml(senderName)}</strong> sent you a message in Go Mission.</p>
      <p style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">${escapeHtml(body)}</p>
      <p>Open Go Mission to reply.</p>
    </div>
  `;
  await Promise.all(recipients.map((userId) => (
    sendEventEmailToUser(
      userId,
      `${senderName} sent you a message`,
      emailHtml
    )
  )));

  return null;
});

exports.onMemberJoined = onDocumentUpdated({
  document: 'goMission_groups/{groupId}',
  secrets: [gmailEmail, gmailPassword]
}, async (event) => {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  
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

      if (after.leaderId) {
        const memberHtml = `
          <div style="font-family:Arial,sans-serif;line-height:1.5">
            <h2 style="margin:0 0 12px">👋 New Member Joined</h2>
            <p><strong>${newMemberName}</strong> joined <strong>${after.name || 'your group'}</strong>.</p>
          </div>
        `;
        await sendEventEmailToUser(
          after.leaderId,
          `New member joined ${after.name || 'your group'}`,
          memberHtml
        );
      }
    }
  }
  
  // Join request (supports both joinRequests and legacy pendingRequests)
  const oldRequests = collectRequests(before);
  const newRequests = collectRequests(after);
  
  console.log('[onMemberJoined] Join requests (merged) - old:', oldRequests.length, 'new:', newRequests.length);
  
  if (newRequests.length > oldRequests.length) {
    const newRequest = newRequests.find((r) => !oldRequests.some((o) => o.requesterId === r.requesterId));
    
    console.log('[onMemberJoined] New request found:', newRequest?.name, 'Leader:', after.leaderId);
    
    if (newRequest && after.leaderId) {
      const notification = {
        title: '🔔 New Join Request',
        body: `${newRequest.name} wants to join ${after.name}`,
        data: {
          type: 'join_request',
          groupId: event.params.groupId
        }
      };
      
      const result = await sendToUser(after.leaderId, notification);
      console.log('[onMemberJoined] Notification result:', result);

      const requestHtml = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="margin:0 0 12px">🔔 New Join Request</h2>
          <p><strong>${newRequest.name}</strong> wants to join <strong>${after.name || 'your group'}</strong>.</p>
          <p>Open Go Mission and tap <strong>View</strong> on your group card to approve.</p>
        </div>
      `;
      await sendEventEmailToUser(
        after.leaderId,
        `New join request for ${after.name || 'your group'}`,
        requestHtml
      );
    }
  }
  
  // Check for new guests
  const oldGuests = before.guests || [];
  const newGuests = after.guests || [];
  
  if (newGuests.length > oldGuests.length) {
    const newGuest = newGuests.find(g => !oldGuests.some(o => o.odId === g.odId));
    
    if (newGuest) {
      // Notify the new guest
      const guestNotification = {
        title: '🎫 You are now a Guest!',
        body: `Welcome to ${after.name} as a guest`,
        data: {
          type: 'guest_approved',
          groupId: event.params.groupId,
          groupName: after.name
        }
      };
      
      await sendToUser(newGuest.odId, guestNotification);
      
      // Notify other members
      const memberNotification = {
        title: `🎫 New Guest!`,
        body: `${newGuest.name} joined ${after.name} as a guest`,
        data: {
          type: 'guest_joined',
          groupId: event.params.groupId,
          guestId: newGuest.odId
        }
      };
      
      const membersToNotify = (after.members || []).filter(id => id !== after.leaderId);
      if (membersToNotify.length > 0) {
        await sendToUsers(membersToNotify, memberNotification);
      }
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

function hasGroupMembership(memberData = {}) {
  if (!memberData || typeof memberData !== 'object') return false;
  const hasGuestGroups = Array.isArray(memberData.guestGroups) && memberData.guestGroups.length > 0;
  return Boolean(memberData.groupId || memberData.uplineGroupId || hasGuestGroups);
}

function isLeaderProfile(memberData = {}) {
  const roles = memberData.roles || {};
  return Boolean(
    roles.isGroupLeader ||
    roles.isTrainer ||
    roles.isShepherd ||
    roles.isAdmin ||
    memberData.groupRole === 'leader'
  );
}

function isActiveProfile(memberData = {}) {
  const status = String(memberData.status || '').toLowerCase();
  if (status === 'inactive' || status === 'paused') return false;
  return true;
}

async function sendToUsersInBatches(userIds = [], notification = {}, batchSize = 40) {
  let successCount = 0;
  let failureCount = 0;
  const errors = [];

  for (let i = 0; i < userIds.length; i += batchSize) {
    const chunk = userIds.slice(i, i + batchSize);
    const results = await sendToUsers(chunk, notification);

    results.forEach((result, idx) => {
      if (result?.success) {
        successCount += 1;
      } else {
        failureCount += 1;
        if (result?.error) {
          errors.push({
            userId: chunk[idx],
            error: String(result.error)
          });
        }
      }
    });
  }

  return { successCount, failureCount, errors };
}

exports.sendCustomNotification = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { targetType, targetId, title, body, notificationType, targetFilter = {} } = request.data;
  const normalizedFilter = (targetFilter && typeof targetFilter === 'object') ? targetFilter : {};
  
  const userDoc = await db.collection('goMission_members').doc(request.auth.uid).get();
  const userData = userDoc.data() || {};
  const roleFlags = (userData.roles && !Array.isArray(userData.roles)) ? userData.roles : {};
  const roleList = Array.isArray(userData.roles) ? userData.roles : [];
  const callerEmail = String(request.auth.token?.email || userData.email || '').toLowerCase();
  const isAllowlistedAdmin =
    ADMIN_UID_ALLOWLIST.has(request.auth.uid) ||
    ADMIN_EMAIL_ALLOWLIST.has(callerEmail);
  const isAdmin = isAllowlistedAdmin || !!roleFlags.isAdmin || roleList.includes('admin');
  const isLeader = !!roleFlags.isGroupLeader ||
    !!roleFlags.isTrainer ||
    !!roleFlags.isShepherd ||
    roleList.includes('leader') ||
    roleList.includes('shepherd') ||
    isAdmin;
  
  if (!isLeader) {
    throw new HttpsError('permission-denied', 'Must be a leader or admin');
  }

  if (!title || !body) {
    throw new HttpsError('invalid-argument', 'Title and body are required');
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
    if (!targetId) throw new HttpsError('invalid-argument', 'targetId is required for user');
    result = await sendToUser(targetId, notification);
  } else if (targetType === 'group') {
    if (!targetId) throw new HttpsError('invalid-argument', 'targetId is required for group');
    result = await sendToGroup(targetId, notification, request.auth.uid);
  } else if (targetType === 'all') {
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only admins can send to all users');
    }

    const usersSnapshot = await db.collection('goMission_members').get();
    let recipientIds = usersSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      data: docSnap.data() || {}
    }));

    if (normalizedFilter.inGroup === true) {
      recipientIds = recipientIds.filter((entry) => hasGroupMembership(entry.data));
    }
    if (normalizedFilter.leaderOnly === true) {
      recipientIds = recipientIds.filter((entry) => isLeaderProfile(entry.data));
    }
    if (normalizedFilter.activeOnly === true) {
      recipientIds = recipientIds.filter((entry) => isActiveProfile(entry.data));
    }

    const ids = recipientIds.map((entry) => entry.id);
    if (!ids.length) {
      return {
        success: true,
        targetCount: 0,
        successCount: 0,
        failureCount: 0,
        message: 'No recipients matched the selected filters.'
      };
    }

    const batchResult = await sendToUsersInBatches(ids, notification);
    result = {
      success: true,
      targetCount: ids.length,
      successCount: batchResult.successCount,
      failureCount: batchResult.failureCount,
      errors: batchResult.errors.slice(0, 25)
    };
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

/**
 * One-time system dispatch for Journal update announcement.
 * Runs on a minute schedule but sends only once (guarded by fixed doc id).
 */
exports.dispatchJournalUpdateAnnouncement = onSchedule({
  schedule: '0 * * * *',
  timeZone: 'Asia/Manila',
}, async () => {
  const sendAfter = Date.parse('2026-03-05T00:25:00+08:00');
  if (Number.isFinite(sendAfter) && Date.now() < sendAfter) {
    return null;
  }

  const announcementId = 'sys_journal_update_20260305';
  const announcementRef = db.collection('goMission_announcements').doc(announcementId);
  const title = 'Journal Update (March 6, 2026)';
  const body = 'Journal now includes Prayer Tracker, improved mobile scrolling, entry view/edit actions, and better answered-prayer follow-up. Please refresh your app for the latest experience.';

  try {
    await announcementRef.create({
      title,
      body,
      audience: 'all_users',
      pushRequested: true,
      source: 'system_scheduler',
      status: 'dispatching',
      createdByUid: 'system',
      createdByEmail: 'system@gomission.local',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    if (code === '6' || code.toLowerCase() === 'already-exists' || message.includes('Already exists')) {
      return null;
    }
    throw error;
  }

  const usersSnapshot = await db.collection('goMission_members').get();
  const recipientIds = usersSnapshot.docs.map((docSnap) => docSnap.id);

  let sendResult = {
    successCount: 0,
    failureCount: 0,
    errors: []
  };

  if (recipientIds.length > 0) {
    sendResult = await sendToUsersInBatches(recipientIds, {
      title,
      body,
      data: {
        type: 'announcement',
        announcementId
      }
    });
  }

  console.log(
    `[JournalAnnouncement] Dispatch result: targets=${recipientIds.length}, success=${sendResult.successCount || 0}, failure=${sendResult.failureCount || 0}`
  );

  await announcementRef.set({
    status: 'sent',
    sentAt: FieldValue.serverTimestamp(),
    dispatch: {
      targetCount: recipientIds.length,
      successCount: Number(sendResult.successCount || 0),
      failureCount: Number(sendResult.failureCount || 0),
      errors: Array.isArray(sendResult.errors) ? sendResult.errors.slice(0, 25) : []
    },
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  console.log('[JournalAnnouncement] Marked as sent.');

  return null;
});
