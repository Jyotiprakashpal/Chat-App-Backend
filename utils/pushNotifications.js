const sendExpoPushNotification = async ({ tokens, title, body, data = {} }) => {
    const validTokens = [...new Set(tokens || [])].filter((token) =>
        typeof token === 'string' &&
        (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
    );

    if (!validTokens.length) return;

    const messages = validTokens.map((to) => ({
        to,
        sound: 'default',
        title,
        body,
        data
    }));

    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messages)
        });
    } catch (error) {
        console.error('Expo push notification failed:', error.message);
    }
};

module.exports = {
    sendExpoPushNotification
};
