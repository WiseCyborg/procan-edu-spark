# Video Call Setup Instructions

## Prerequisites
You need a LiveKit Cloud account to enable video calling functionality.

## Step 1: Create LiveKit Cloud Account

1. Go to https://cloud.livekit.io
2. Sign up for a free account
3. Create a new project

## Step 2: Get Your Credentials

After creating your project, you'll need three pieces of information:

1. **API Key** - Found in your project settings
2. **API Secret** - Found in your project settings
3. **LiveKit URL** - Your project's WebSocket URL (format: `wss://your-project.livekit.cloud`)

## Step 3: Add Secrets to Lovable

Add the following three secrets through the Lovable interface:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `LIVEKIT_API_KEY` | Your API Key from LiveKit | `APIxxxxxxxxxxxx` |
| `LIVEKIT_API_SECRET` | Your API Secret from LiveKit | `xxxxxxxxxxxxxxxx` |
| `LIVEKIT_URL` | Your project's WebSocket URL | `wss://procannedu.livekit.cloud` |

## Step 4: Add Environment Variable (Optional)

If you want to use a custom LiveKit URL in the frontend, add this to your environment:

```
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
```

Otherwise, it will default to `wss://procannedu.livekit.cloud`.

## Features Enabled

Once configured, the following features will be available:

### For Training Coordinators, Managers, and Admins:
- **Start Video Calls** - Click "Start Video Call" button in any conversation
- **Host Training Sessions** - Screen sharing, participant management
- **One-on-One Calls** - Direct video communication with team members
- **Study Sessions** - Host live Q&A sessions with students

### For All Users:
- **Join Video Calls** - Join calls started by coordinators/managers
- **Camera Controls** - Toggle video on/off
- **Microphone Controls** - Mute/unmute audio
- **Participant List** - See who's in the call

## Role-Based Permissions

| Action | Student | Coordinator | Manager | Admin |
|--------|---------|-------------|---------|-------|
| Join calls | ✅ | ✅ | ✅ | ✅ |
| Start calls | ❌ | ✅ | ✅ | ✅ |
| Screen share | ❌ | ✅ | ✅ | ✅ |
| End meeting | ❌ | ✅ | ✅ | ✅ |

## Database Tables

The migration created two tables:

### `video_calls`
Stores video call metadata including:
- Room name, title, call type
- Host, organization, conversation
- Start/end times, participant limits
- Recording status

### `video_call_participants`
Tracks who joined each call:
- User ID, join/leave times
- Role (host, co_host, participant)

## Troubleshooting

### "LiveKit credentials not configured" error
- Verify all three secrets are added correctly in Lovable
- Check that secret names match exactly (case-sensitive)
- Redeploy the edge functions after adding secrets

### Can't see "Start Video Call" button
- Only Training Coordinators, Managers, and Admins can start calls
- Check your user role in the database

### Connection fails when joining
- Verify `LIVEKIT_URL` is correct
- Check LiveKit Cloud project status
- Ensure WebSocket URL uses `wss://` protocol

## Cost & Limits

LiveKit Cloud free tier includes:
- 10,000 participant minutes per month
- 50 concurrent participants
- Unlimited rooms

For ProCann Edu's estimated usage:
- ~20 training sessions per month
- ~10 participants per session
- ~1 hour per session
= ~200 participant minutes/month (well within free tier)

## Support

For LiveKit support: https://docs.livekit.io
For ProCann Edu specific issues: Contact admin