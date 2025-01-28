const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 1911;

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;
const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
const ONE_MINUTE_IN_MS = 1 * 60 * 1000;

const tokensFilePath = path.join(__dirname, 'tokens.json');
let users = [];

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // For parsing application/json

function logResponseToFile(requestType, userId, response) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `${requestType}-${timestamp}.txt`;
    const dirPath = path.join(`request-logs/${userId}/${requestType}`);

    fs.mkdirSync(dirPath, { recursive: true });

    const filePath = path.join(dirPath, filename);

    const logContent = `
Status: ${response.status}
Headers: ${JSON.stringify(response.headers, null, 2)}
Body: ${JSON.stringify(response.data, null, 2)}
    `;

    fs.writeFileSync(filePath, logContent.trim(), 'utf-8');
}

function info(action) {
    const currentTime = new Date().toLocaleTimeString();
    let colorCode = '';
    let actionLabel = '';

    switch (action.toLowerCase()) {
        case 'checkin':
            colorCode = '\x1b[38;5;46m';
            actionLabel = '[CHECK-IN]';
            break;
        case 'scheduled':
            colorCode = '\x1b[38;5;75m';
            actionLabel = '[SCHEDULED]';
            break;
        case 'refresh':
            colorCode = '\x1b[38;5;226m';
            actionLabel = '[REFRESH]';
            break;
        case 'error':
            colorCode = '\x1b[38;5;196m';
            actionLabel = '[ERROR]';
            break;
        case 'info':
            colorCode = '\x1b[38;5;211m';
            actionLabel = '[INFO]';
            break;
        default:
            colorCode = '\x1b[0m';
            actionLabel = `[${action.toUpperCase()}]`;
    }

    return `${colorCode}${actionLabel}\x1b[0m - ${currentTime}`;
}

const getCurrentUnixTimestamp = () => Math.floor(Date.now() / 1000);

// Load Tokens from tokens.json
function loadTokens() {
    if (fs.existsSync(tokensFilePath)) {
        const data = fs.readFileSync(tokensFilePath, 'utf-8');
        users = JSON.parse(data).map(user => ({
            ...user,
            lessonData: null,
            endTime: 0,
            lastFetchedTime: 0,
            scheduledLessons: new Set(),
            scheduledTimeouts: [],
            expectedCheckIns: [],
        }));
        console.log(info('info') + ` - Loaded ${users.length} tokens from tokens.json`);
    } else {
        console.log(info('error') + ' - tokens.json file not found');
    }
}

// Save Tokens to tokens.json
function saveTokens() {
    const tokenData = users.map(user => ({
        id: user.id,
        token: user.token
    }));
    fs.writeFileSync(tokensFilePath, JSON.stringify(tokenData, null, 2), 'utf-8');
    console.log(info('info') + ` - Saved ${users.length} tokens to tokens.json`);
}

// Fetch Lesson Data for a User
const fetchLessonData = async (user) => {
    const currentTime = getCurrentUnixTimestamp();
    const startDate = currentTime;
    const endDate = currentTime + 7 * 24 * 60 * 60; // ONE WEEK AHEAD

    const url = `https://01v2mobileapi.seats.cloud/api/v1/students/myself/events?startDate=${startDate}&endDate=${endDate}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': user.token,
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-GB,en;q=0.9',
                'Connection': 'keep-alive',
                'Host': '01v2mobileapi.seats.cloud',
                'User-Agent': 'SeatsMobile/1728493384 CFNetwork/1568.100.1.2.1 Darwin/24.0.0'
            }
        });

        logResponseToFile('FetchLessons', user.id, response);

        user.lessonData = response.data;
        user.endTime = endDate;
        user.lastFetchedTime = Date.now();

        console.log(`${info('refresh')} - Lesson data fetched for user ${user.id}`);

        scheduleCheckIns(user);

    } catch (error) {
        console.error(`${info('error')} - Error fetching lessons for user ${user.id}: ${error}`);
    }
};

// Schedule Check-Ins for a User
const scheduleCheckIns = (user) => {
    const currentTime = new Date().getTime();

    user.lessonData.forEach(lesson => {
        if (user.scheduledLessons.has(lesson.eventId)) {
            return;
        }

        const lessonStartTime = new Date(lesson.start * 1000).getTime();

        // Generate random offset between -60s and +60s
        const randomOffset = Math.floor(Math.random() * 120000) - 60000; // -60000 to +60000 ms

        // Checks the user in one minute before the lessonStartTime +- 60 seconds
        const checkInTime = lessonStartTime - ONE_MINUTE_IN_MS + randomOffset;

        if (checkInTime > currentTime) {
            const timeUntilCheckIn = checkInTime - currentTime;

            // Schedule the check-in and store the timeout ID
            const timeoutId = setTimeout(() => {
                sendCheckinRequest(user, lesson);

                // After the check-in is sent, remove the timeout ID from the array
                user.scheduledTimeouts = user.scheduledTimeouts.filter(id => id !== timeoutId);

                // Remove the scheduled check-in from the array
                user.expectedCheckIns = user.expectedCheckIns.filter(ci => ci.lessonId !== lesson.eventId);
            }, timeUntilCheckIn);

            // Store the timeout ID
            user.scheduledTimeouts.push(timeoutId);

            // Store the expected check-in time
            if (!user.expectedCheckIns) {
                user.expectedCheckIns = [];
            }
            user.expectedCheckIns.push({
                lessonId: lesson.eventId,
                lessonTitle: lesson.title,
                checkInTime: checkInTime,
            });

            console.log(`${info('scheduled')} - Scheduled check-in for user ${user.id}, lesson '${lesson.title}' at ${new Date(checkInTime).toLocaleString()}`);
            user.scheduledLessons.add(lesson.eventId);
        }
    });
};



// Send Check-In Request for a User
const sendCheckinRequest = async (user, lesson) => {
    const uuid = lesson.iBeaconData[0].uuid;

    const checkinPayload = {
        Id: null,
        StudentId: null,
        EventId: lesson.eventId,
        Longitude: "",
        Latitude: "",
        LocationName: "",
        CheckInReason: "Ibeacon",
        DateTime: new Date().toISOString().split('.')[0],
        BadgeNumber: "",
        TimetableId: lesson.timeTableId,
        Uuid: uuid
    };

    const payloadString = JSON.stringify(checkinPayload);

    const headers = {
        'Authorization': user.token,
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
        'Connection': 'keep-alive',
        'Host': '01v2mobileapi.seats.cloud',
        'User-Agent': 'SeatsMobile/1728493384 CFNetwork/1568.100.1.2.1 Darwin/24.0.0'
    };

    try {
        const response = await axios.post('https://01v2mobileapi.seats.cloud/api/v1/students/myself/checkins', payloadString, { headers });
        logResponseToFile('CheckIn', user.id, response);
        console.log(`${info('checkin')} - Check-in successful for user ${user.id}, lesson: ${lesson.eventId}`);
    } catch (error) {
        console.error(`${info('error')} - Check-in failed for user ${user.id}: ${error}`);
    }
};

// Get Upcoming Lessons for a User
const getUpcomingLessons = (user) => {
    const currentTime = getCurrentUnixTimestamp();

    const upcomingLessons = user.lessonData
        ? user.lessonData.filter(event => event.start > currentTime)
        : [];

    return upcomingLessons.map(event => ({
        title: event.title,
        roomName: event.roomName,
        start: event.start,
        checkinCode: event.checkinCode
    }));
};

// Routes for Admin Dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API Endpoints
app.get('/api/tokens', (req, res) => {
    const tokenList = users.map(user => ({
        id: user.id
    }));
    res.json(tokenList);
});

app.post('/api/tokens', (req, res) => {
    const { id, token } = req.body;

    if (!id || !token) {
        return res.status(400).json({ error: 'ID and token are required' });
    }

    if (users.find(user => user.id === id)) {
        return res.status(400).json({ error: 'User ID already exists' });
    }

    const newUser = {
        id,
        token,
        lessonData: null,
        endTime: 0,
        lastFetchedTime: 0,
        scheduledLessons: new Set(),
        scheduledTimeouts: [],
        expectedCheckIns: [],
    };

    users.push(newUser);
    saveTokens();
    fetchLessonData(newUser);

    res.json({ success: true });
});

app.delete('/api/tokens/:id', (req, res) => {
    const userId = req.params.id;

    const userIndex = users.findIndex(user => user.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const user = users[userIndex];
    if (user.scheduledTimeouts && user.scheduledTimeouts.length > 0) {
        user.scheduledTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        console.log(`${info('info')} - Canceled ${user.scheduledTimeouts.length} scheduled check-ins for user ${user.id}`);
    }

    users.splice(userIndex, 1);
    saveTokens();

    res.json({ success: true });
});

// Upcoming Lessons API
app.get('/api/upcoming-lessons', async (req, res) => {
    const currentTime = Date.now();

    for (const user of users) {
        if (currentTime - user.lastFetchedTime > TEN_MINUTES_IN_MS) {
            console.log(`${info('info')} - Fetching new lessons for user ${user.id}`);
            await fetchLessonData(user);
        }
    }

    const allLessons = users.map(user => ({
        userId: user.id,
        lessons: getUpcomingLessons(user),
        lastFetchedTime: user.lastFetchedTime
    }));

    res.json({
        users: allLessons
    });
});

// **New Endpoint for User Info**
app.get('/api/userinfo/:id', async (req, res) => {
    const userId = req.params.id;
    const user = users.find(u => u.id === userId);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }


    try {
        const response = await axios.get('https://01v2mobileapi.seats.cloud/api/v1/students/myself/profile', {
            headers: {
                'Authorization': `${user.token}`,
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-GB,en;q=0.9',
                'Connection': 'keep-alive',
                'User-Agent': 'SeatsMobile/1728493384 CFNetwork/1568.100.1.2.1 Darwin/24.0.0',
                'Host': '01v2mobileapi.seats.cloud'
            }
        });

        // Log response to file
        logResponseToFile('UserInfo', user.id, response);

        res.json(response.data);
    } catch (error) {
        console.error(`${info('error')} - Error fetching user info for user ${user.id}: ${error}`);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

app.get('/api/expected-checkins', (req, res) => {
    const expectedCheckInsData = users.map(user => ({
        userId: user.id,
        expectedCheckIns: user.expectedCheckIns || [],
    }));

    res.json({
        users: expectedCheckInsData,
    });
});

// Periodic Refresh
setInterval(async () => {
    console.log(`${info('refresh')} - Refreshing lessons for all users`);
    for (const user of users) {
        await fetchLessonData(user);
    }
}, THIRTY_MINUTES_IN_MS);

// Start Server
app.listen(port, async () => {
    console.log(info('info') + ` - Server running at http://localhost:${port}/admin`);

    loadTokens();

    for (const user of users) {
        await fetchLessonData(user);
    }
});
