# GroupGuardian — Bot specification

**Archetype:** community

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A Telegram group management bot that automates welcome messages, enforces anti-spam rules, allows admin configuration of moderation policies, and maintains action logs and usage overviews for groups. Prioritizes lightweight automation with human verification for new members and tiered auto-actions for spam.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Telegram group admins
- Moderators of public/community groups

## Success criteria

- Automated welcome message with verification sent to all new members
- Spam messages detected and auto-actioned according to configured thresholds
- Admins can configure custom welcome text, rules, and thresholds
- Action logs stored with 1000-entry retention and accessible via /log
- Overview statistics displayed for 7d and 30d periods

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main admin menu for configuration options
- **I'm human** (button, actor: user, callback: verify:member) — Verification button for new members to confirm humanity
- **/warn** (command, actor: admin, command: /warn) — Issue warning to specified user with explanation
- **/mute** (command, actor: admin, command: /mute) — Mute user for specified duration with explanation
- **/log** (command, actor: admin, command: /log) — Display recent N moderation actions in chat
- **/overview** (command, actor: admin, command: /overview) — Show statistical overview of group activity

## Flows

### new_member_verification
_Trigger:_ new_member_joined

1. Send welcome message with 'I'm human' button
2. Restrict posting until verification
3. On button tap: verify member and lift restrictions
4. If unverified after timeout: remove member and log action

_Data touched:_ Member, Pending verification

### spam_moderation
_Trigger:_ message_posted

1. Check message against spam thresholds (account age, repetition, flood)
2. If threshold hit: send explanation to chat
3. Apply configured auto-action (warn/mute/remove)
4. Record infraction and log action

_Data touched:_ Infraction record, Admin command log

### admin_configuration
_Trigger:_ /setwelcome

1. Receive custom welcome text
2. Update group settings
3. Confirm update to admin

_Data touched:_ Group settings

### action_logging
_Trigger:_ /log

1. Retrieve last N actions from log
2. Format and display in chat

_Data touched:_ Admin command log

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **Member** _(retention: persistent)_ — Group member profile with status tracking
  - fields: id, display name, join time, trusted flag, verification status
- **Pending verification** _(retention: session)_ — Verification session tracking for new members
  - fields: member id, challenge message id, expires_at
- **Infraction record** _(retention: persistent)_ — Record of moderation actions taken
  - fields: member id, type, timestamp, reason, moderator
- **Admin command log** _(retention: persistent)_ — History of all moderation actions
  - fields: action, target, moderator, timestamp
- **Group settings** _(retention: persistent)_ — Configurable bot policies for the group
  - fields: welcome text, rules, auto-action thresholds, trusted users list

## Integrations

- **Telegram** (required) — Bot API messaging and group management
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- /warn <user> [reason]
- /mute <user> <duration>
- /kick <user>
- /ban <user>
- /trust <user>
- /untrust <user>
- /setwelcome <text>
- /setrules <text>
- /setthresholds [parameters]
- /log <n>
- /overview

## Notifications

- Direct message to admins when auto-removal occurs (configurable)
- Inline explanations for all automated moderation actions in chat

## Permissions & privacy

- Only admins can execute moderation commands
- Bot never acts on admins by role
- No moderation of pinned messages
- Verification data deleted after timeout if failed

## Edge cases

- Members who leave before verification completes
- Spam messages that match multiple thresholds simultaneously
- Admin commands issued without proper permissions
- Log requests exceeding available history (N > 1000)

## Required tests

- Verify new member verification flow with timeout
- Test spam detection against all threshold combinations
- Validate admin command execution and logging
- Confirm log display with edge cases (N=0, N=1000)

## Assumptions

- Verification timeout defaults to 3 minutes
- Spam thresholds use default values unless changed
- Auto-action sequence follows warn->mute->remove progression
- Trusted users are exempt from verification and spam rules
