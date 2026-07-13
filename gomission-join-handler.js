/**
 * gomission-join-handler.js
 * Handles group join requests entirely via local Postgres.
 * No Firebase, no Cloud Functions, no quota limits.
 */

const { query } = require('./netlify/functions/_lib/postgres');
const { parseCookies, json } = require('./netlify/functions/_lib/http');
const { loadSessionMember } = require('./netlify/functions/_lib/session');

async function handleJoinRequest(event) {
  // 1. Authenticate the requesting member
  const cookies = parseCookies(event);
  const { SESSION_COOKIE_NAME } = require('./netlify/functions/_lib/session');
  const member = await loadSessionMember(cookies[SESSION_COOKIE_NAME]);
  if (!member) {
    return json(401, { error: 'Please sign in to join a group.' });
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}
  const code = String(body.code || '').trim().toUpperCase();
  if (!code || code.length !== 6) {
    return json(400, { error: 'Please enter a valid 6-character invite code.' });
  }

  // 2. Look up the invite code
  const codeResult = await query(
    `SELECT ic.id, ic.group_id, ic.is_active, ic.expires_at,
            ic.usage_limit, ic.usage_count,
            g.id as gid, g.name as group_name, g.status as group_status,
            g.legacy_firestore_id as group_firestore_id
     FROM gomission.group_invite_codes ic
     JOIN gomission.groups g ON g.id = ic.group_id
     WHERE ic.code = $1 LIMIT 1`,
    [code]
  );
  const invite = codeResult.rows[0];
  if (!invite) {
    return json(404, { error: 'Invalid invite code. Please check and try again.' });
  }
  if (!invite.is_active) {
    return json(409, { error: 'This invite code is no longer active.' });
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return json(409, { error: 'This invite code has expired. Ask the group leader for a new one.' });
  }
  if (invite.usage_limit && invite.usage_count >= invite.usage_limit) {
    return json(409, { error: 'This invite code has reached its usage limit.' });
  }
  if (invite.group_status !== 'active') {
    return json(409, { error: 'This group is no longer active.' });
  }

  // 3. Check if already a member or has pending request
  const existingResult = await query(
    `SELECT id, membership_status FROM gomission.group_memberships
     WHERE group_id = $1 AND member_id = $2 LIMIT 1`,
    [invite.gid, member.id]
  );
  const existing = existingResult.rows[0];
  if (existing) {
    if (existing.membership_status === 'active') {
      return json(409, { error: 'You are already a member of this group.' });
    }
    if (existing.membership_status === 'pending') {
      return json(409, { error: 'You already have a pending request for this group.' });
    }
  }

  // 4. Create the pending join request
  await query(
    `INSERT INTO gomission.group_memberships
       (group_id, member_id, role, membership_status, is_primary, metadata)
     VALUES ($1, $2, 'member', 'pending', false,
       jsonb_build_object(
         'invite_code', $3,
         'requested_at', now()::text,
         'requester_name', $4,
         'requester_email', $5
       ))
     ON CONFLICT (group_id, member_id) DO UPDATE
       SET membership_status = 'pending',
           metadata = EXCLUDED.metadata,
           updated_at = now()`,
    [invite.gid, member.id, code,
     member.display_name || member.full_name || '',
     member.email || '']
  );

  // 5. Queue a notification event for the group leader
  await query(
    `INSERT INTO gomission.event_outbox
       (aggregate_type, aggregate_id, event_type, payload)
     VALUES ('group', $1, 'join_request_received',
       jsonb_build_object(
         'group_id', $1,
         'group_name', $2,
         'member_id', $3,
         'member_name', $4,
         'member_email', $5,
         'invite_code', $6,
         'group_firestore_id', $7
       ))`,
    [invite.gid, invite.group_name, member.id,
     member.display_name || member.full_name || '',
     member.email || '', code,
     invite.group_firestore_id || '']
  );

  return json(200, {
    ok: true,
    groupName: invite.group_name,
    message: `Request sent to ${invite.group_name}! The group leader will review your request.`
  });
}

module.exports = { handleJoinRequest };
