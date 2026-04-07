# Daily Challenge Streak Feature

## Overview
The Daily Challenge Streak system encourages users to complete coding challenges daily. Users build up streaks by completing challenges on consecutive days. Missing a day resets the streak to 0.

## How It Works

### Streak Rules
1. **Starting a Streak**: Complete today's daily challenge to start a streak (streak = 1)
2. **Continuing a Streak**: Complete the daily challenge on consecutive days to increase your streak
3. **Breaking a Streak**: Miss a day and your streak resets to 0
4. **Longest Streak**: The system tracks your longest streak ever achieved

### Daily Challenge Generation
- A new daily challenge is automatically created every day at midnight (UTC)
- Challenges are randomly selected from the Challenge Service
- Bonus XP is awarded based on difficulty:
  - Easy: 30 XP
  - Medium: 50 XP
  - Hard: 80 XP
  - Expert: 100 XP

## API Endpoints

### 1. Get Today's Daily Challenge
```
GET /users/daily-challenge/today
Authorization: Bearer <token>
```

**Response:**
```json
{
  "_id": "challenge_id",
  "date": "2026-04-07T00:00:00.000Z",
  "challengeId": "challenge_object_id",
  "challengeData": {
    "title": "Two Sum",
    "description": "Find two numbers that add up to target",
    "difficulty": "easy",
    "language": "javascript"
  },
  "bonusXp": 30,
  "completedBy": []
}
```

### 2. Complete Daily Challenge
```
POST /users/:userId/daily-challenge/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "challengeId": "challenge_id"
}
```

**Response:**
```json
{
  "message": "Daily challenge completed successfully",
  "streak": 5,
  "longestStreak": 10,
  "bonusXp": 50,
  "streakIncreased": true
}
```

### 3. Get User's Daily Challenge Stats
```
GET /users/:userId/daily-challenge/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "currentStreak": 5,
  "longestStreak": 10,
  "lastCompletedDate": "2026-04-07T00:00:00.000Z",
  "totalDailyChallengesCompleted": 25,
  "completedToday": true
}
```

## Database Schema

### User Schema Addition
```typescript
dailyChallenge: {
  currentStreak: number;        // Current consecutive days
  longestStreak: number;        // Best streak ever
  lastCompletedDate?: Date;     // Last completion date
  totalDailyChallengesCompleted: number;  // Total count
}
```

### DailyChallenge Schema
```typescript
{
  date: Date;                   // Challenge date (midnight UTC)
  challengeId: ObjectId;        // Reference to Challenge
  challengeData: {              // Cached challenge info
    title: string;
    description: string;
    difficulty: string;
    language: string;
  };
  bonusXp: number;             // XP reward
  completedBy: ObjectId[];     // Users who completed it
}
```

## Installation

1. Install required package:
```bash
cd Esprit-PIFullstackJS-4TWIN2-2026-bytebattle-user_service
npm install @nestjs/schedule axios
```

2. The feature is already integrated into the user service

3. Ensure the Challenge Service URL is configured in your environment:
```env
CHALLENGE_SERVICE_URL=http://localhost:3002
```

## Testing

### Manual Daily Challenge Creation
For testing purposes, you can manually trigger daily challenge creation by calling the cron job directly in your code or creating an admin endpoint.

### Example Flow
1. User logs in and checks today's daily challenge
2. User completes the challenge in the Challenge Service
3. User calls the complete endpoint with the challenge ID
4. System verifies it's today's challenge and updates streak
5. User receives bonus XP and streak information

## Frontend Integration Tips

### Display Streak Information
- Show current streak prominently on user dashboard
- Display longest streak as an achievement
- Use fire emoji or similar visual for active streaks
- Show "X days in a row!" message

### Notifications
- Remind users to complete daily challenge
- Celebrate streak milestones (7 days, 30 days, 100 days)
- Warning when streak is at risk (haven't completed today)

### Visual Indicators
- Calendar view showing completed days
- Progress bar for current streak
- Badge/trophy for longest streak achievements

## Future Enhancements
- Weekly streak rewards (bonus XP multiplier)
- Streak freeze items (skip one day without losing streak)
- Leaderboard for longest active streaks
- Special badges for milestone streaks (7, 30, 100, 365 days)
- Push notifications for streak reminders
