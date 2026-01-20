/**
 * Go Mission - Cloud Functions
 * Email notifications for group chat messages
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Gmail SMTP Configuration
const gmailEmail = 'appgomission@gmail.com';
const gmailAppPassword = 'vhqo cakq qjbv xgxp';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailAppPassword.replace(/\s/g, '') // Remove spaces
  }
});

/**
 * Triggered when a new chat message is created
 * Sends email notification to all group members (except sender)
 */
exports.onNewChatMessage = functions.firestore
  .document('goMission_chats/{messageId}')
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    const messageId = context.params.messageId;
    
    console.log(`[Email] New message in group ${message.groupId} from ${message.senderName}`);
    
    try {
      // Get the group to find members
      const groupDoc = await db.collection('goMission_groups').doc(message.groupId).get();
      
      if (!groupDoc.exists) {
        console.log('[Email] Group not found:', message.groupId);
        return null;
      }
      
      const group = groupDoc.data();
      const memberIds = group.members || [];
      
      console.log(`[Email] Group has ${memberIds.length} members`);
      
      // Get member details and send emails
      const emailPromises = [];
      
      for (const memberId of memberIds) {
        // Skip the sender
        if (memberId === message.senderId) continue;
        
        // Get member data
        const memberDoc = await db.collection('goMission_members').doc(memberId).get();
        
        if (!memberDoc.exists) continue;
        
        const member = memberDoc.data();
        
        // Check if member has email notifications enabled (default: true)
        if (member.emailNotifications === false) {
          console.log(`[Email] Skipping ${member.email} - notifications disabled`);
          continue;
        }
        
        // Check if member has email
        if (!member.email) {
          console.log(`[Email] Skipping ${memberId} - no email`);
          continue;
        }
        
        // Prepare email content
        const messagePreview = message.type === 'devotion' 
          ? `📖 Shared a devotion from ${message.devotion?.book} ${message.devotion?.chapter}`
          : (message.text || '').substring(0, 100);
        
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #1a0505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a0505; padding: 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background-color: #2a0505; border-radius: 16px; border: 1px solid rgba(251, 191, 36, 0.2); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4a0404 0%, #2a0505 100%); padding: 24px; text-align: center;">
              <span style="color: #fbbf24; font-size: 20px;">★</span>
              <span style="color: #ffffff; font-size: 20px; font-weight: bold; letter-spacing: 2px; margin-left: 8px;">GO MISSION</span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              <p style="color: #94a3b8; font-size: 14px; margin: 0 0 16px 0;">New message in <strong style="color: #fbbf24;">${group.name || 'your group'}</strong></p>
              
              <!-- Message Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px;">
                <tr>
                  <td style="padding: 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <img src="${message.senderPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.senderName)}&background=4a0404&color=fbbf24`}" 
                               style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(251, 191, 36, 0.3);">
                        </td>
                        <td style="vertical-align: top;">
                          <p style="color: #fbbf24; font-weight: bold; font-size: 14px; margin: 0 0 4px 0;">${message.senderName}</p>
                          <p style="color: #e2e8f0; font-size: 14px; margin: 0; line-height: 1.5;">${messagePreview}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="https://gomission.netlify.app" 
                       style="display: inline-block; background-color: #fbbf24; color: #2a0505; font-weight: bold; font-size: 14px; padding: 12px 32px; border-radius: 12px; text-decoration: none;">
                      Open Go Mission
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
                You're receiving this because you're a member of ${group.name}.<br>
                <a href="https://gomission.netlify.app" style="color: #64748b;">Manage notification settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;
        
        // Send email
        const mailOptions = {
          from: `"Go Mission" <${gmailEmail}>`,
          to: member.email,
          subject: `💬 ${message.senderName} sent a message in ${group.name}`,
          html: emailHtml
        };
        
        emailPromises.push(
          transporter.sendMail(mailOptions)
            .then(() => console.log(`[Email] Sent to ${member.email}`))
            .catch(err => console.error(`[Email] Failed to send to ${member.email}:`, err.message))
        );
      }
      
      await Promise.all(emailPromises);
      console.log(`[Email] Finished processing message ${messageId}`);
      
      return null;
      
    } catch (error) {
      console.error('[Email] Error:', error);
      return null;
    }
  });

/**
 * Test function to verify email is working
 */
exports.testEmail = functions.https.onRequest(async (req, res) => {
  try {
    await transporter.sendMail({
      from: `"Go Mission" <${gmailEmail}>`,
      to: req.query.email || 'michael.marga@gmail.com',
      subject: '✅ Go Mission Email Test',
      html: '<h1>Email is working!</h1><p>Your Go Mission email notifications are configured correctly.</p>'
    });
    res.send('Test email sent successfully!');
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).send('Error: ' + error.message);
  }
});
