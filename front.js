require('dotenv').config();
const { Bot, session , HttpError, GrammyError } = require('grammy');
const { conversations } = require('@grammyjs/conversations');
const cron = require('node-cron')
const fs = require('fs');
const now = new Date();

const BACKEND_ROOT_URL = process.env.BACKEND_ROOT_URL;

// Create the bot
const bot = new Bot(process.env.BOT_API_KEY);

const subscribersFile = './subscribers.json';
function getSubscribers() {
    if (fs.existsSync(subscribersFile)) {
        const data = fs.readFileSync(subscribersFile, 'utf8');
        return JSON.parse(data);
    }
    return [];
}

function saveSubscribers(subscribers) {
    fs.writeFileSync(subscribersFile, JSON.stringify(subscribers, null, 2));
}

// Middleware for session and conversations
bot.use(session({ initial: () => ({}) }));
bot.use(conversations());

bot.api.setMyCommands([
    { command: 'start', description: 'Starting message' },
    { command: 'hello', description: 'Says hello' },
    { command: 'help', description: 'What I can do for you' },
    { command: 'links', description: 'Links for each restraunts' },
    { command: 'menutoday', description: 'Sends menu for today (N.B. might take about 20 sec to complete)' },
    { command: 'subscribe', description: 'if you want me to send menu automatically every day' },
    { command: 'unsubscribe', description: 'if you want to stop recieving menu every day' },
]);

const getWeekday = () => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = daysOfWeek[now.getDay()]; // getDay() возвращает число от 0 (воскресенье) до 6 (суббота)

    return weekday
}

const getDate = () => {
    const hours = now.getHours(); // Часы (0-23)
    const minutes = now.getMinutes(); // Минуты (0-59)
    const seconds = now.getSeconds(); // Секунды (0-59)

    const date = now.getDate(); 
    const month = now.getMonth() + 1; 
    const year = now.getFullYear();  

    const formattedDate = `${date}.${month}.${year}`;
    let formattedTime = `${hours}:${minutes}:${seconds}`
    if(minutes <= 9){
        formattedTime = `${hours}:0${minutes}:${seconds}`
    }
    

    return `Menu for today - ${formattedDate}, time: ${formattedTime}`
}

const getMenu = async () => {
    const response = await fetch(`${BACKEND_ROOT_URL}/getmenu`);
    const json = await response.json();
    return json;
};

const renderMenuItems = (menuFull) => {
    let superItems = ''
    if(!menuFull && !menuFull.message){
        menuFull.forEach(rest => {
            superItems += `\n\n\n<b>Restaraunt <i>${rest.name.toUpperCase()}:</i></b>\n`;  // Название ресторана курсивом
            rest.menuList.forEach(item => {
                superItems += `\n<b>${item.topic}</b>\n\n`;  // Тема меню жирным
                item.meals.forEach(mmm => {
                    superItems += `${mmm.meal} diets: <i>${mmm.diets}</i>\n`;  // "diets" курсивом
                });
            });
        });
    }else superItems = "\n\nServer does not respond with correct data or restaraunts do not work today. Check /links command."

    return superItems
}

// Command handlers
bot.command('start', async (ctx) => {
    await ctx.reply(`
<b><i>Hello and welcome to OAMK menu bot!</i></b>

I make it easier to check menu in OAMK Linnanmaa campus. You can find more information about each commmand here /help

Admin and developer: <a href='https://t.me/mmaks_kalashnikov'>Maks</a>
        `, 
        {parse_mode: 'HTML'});
});

bot.command('hello', async (ctx) => {
    await ctx.reply("Hi there!");
});

bot.command('help', async (ctx) => {
    await ctx.reply(
        `
<i><b>Help desk for OAMK menu bot:</b></i>

I can show you menu for every OAMK's restaurant. You can also ask me to send it to you every morning. Here is the list and short description of available commands:

/start - starting message
/hello - in case you want me to say hi to you
/help - sends this message 
/menutoday - prints menu for today (can take about 20 sec to finish)
/links - shows you source links with the menu of each restraunt
/subscribe - if you want me to send menu automatically every workday
/unsubscribe - if you want to stop recieving menu every workday

Need more help? Contact me here: <b><a href='https://t.me/mmaks_kalashnikov'>Maks</a></b>
        `,
        { parse_mode: "HTML" }
    );
});

bot.command('menutoday', async(ctx) => {
    if(getWeekday() == "Saturday" || getWeekday() == "Sunday"){
        await ctx.reply("Menu is not provided for weekends by this bot. You can check websites with menu manually, if you wish: /links", 
            { parse_mode: "HTML" });
    }else{

        const waitingMessage = await ctx.reply("I am processing your request, please wait a bit...");

        const loadingMessages = [
            "I am processing your request, please wait a bit...",
            "Still working on it...",
            "We are almost there...",
            "Just a bit left..."
        ];

        let messageIndex = 0;

        const intervalId = setInterval(async () => {
            messageIndex = (messageIndex + 1) % loadingMessages.length; 
            try {
                await ctx.api.editMessageText(ctx.chat.id, waitingMessage.message_id, loadingMessages[messageIndex]);
            } catch (err) {
                console.error("Error:", err);
            }
        }, 2000);

        const menuJson = await getMenu()
        const zal = await renderMenuItems(menuJson)
        clearInterval(intervalId);
        await ctx.api.editMessageText(ctx.chat.id, waitingMessage.message_id, `${getDate()}: ${zal}`, {parse_mode: "HTML"});
    }
})
bot.command('links', async(ctx) => {
    await ctx.reply(`
        Links for each restaurant:

Linnanmaa campus

Mara: https://fi.jamix.cloud/apps/menu/?anro=93077&k=49&mt=111
Kerttu (Kastari): https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=118
Voltti (Kylymä): https://fi.jamix.cloud/apps/menu/?anro=93077&k=70&mt=119 
Lipasto (Napa): https://mealdoo.com/week/uniresta/lipasto/ravintolalipasto?date=2024-09-30&lang=en&theme=light--light-green
Julinia (FooDoo and FooDoo Graden): https://mealdoo.com/week/uniresta/julinia/ravintolajulinia?date=2024-09-30&lang=en&theme=light--green

Kontinkangas campus

Alwari: https://www.compass-group.fi/en/ravintolat-ja-ruokalistat/amica/kaupungit/oulu/alwari/
        `)
})

bot.command('subscribe', async (ctx) => {
    const chatId = ctx.chat.id;
    let subscribers = getSubscribers();

    if (!subscribers.includes(chatId)) {
        subscribers.push(chatId);
        saveSubscribers(subscribers);
        await ctx.reply('You subscribed to menu sender! From now on you will get menu every workday (MON - FRI) at 09:00 ');
    } else {
        await ctx.reply('You are already subscribed.');
    }
});

bot.command('unsubscribe', async (ctx) => {
    const chatId = ctx.chat.id;
    let subscribers = getSubscribers();

    if (subscribers.includes(chatId)) {
        subscribers = subscribers.filter(id => id !== chatId);
        saveSubscribers(subscribers);
        await ctx.reply('You are unsubscribed now. If you want to sunscribe again in future, use /subscribe');
    } else {
        await ctx.reply('You are not subscribed to the menu sender. If you want to subscribe: /subscribe');
    }
});

const sendMenuToSubscribers = async () => {
    const subscribers = getSubscribers();

    const menuJson = await getMenu()
    const menuMessage = await renderMenuItems(menuJson) 

    for (const chatId of subscribers) {
        try {
            await bot.api.sendMessage(chatId, menuMessage, { parse_mode: "HTML" });
        } catch (error) {
            console.error(`Couldn't send to ${chatId}:`, error);
        }
    }
};

bot.on('message', async (ctx) => {
    await ctx.reply("I don't yet know how to reply to your message :(\n\nYou can check help desk for available commands: /help", 
        { parse_mode: "HTML" });
})

// Error handling
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
        console.error("Could not contact Telegram:", e);
    } else {
        console.error("Unknown error:", e);
    }
});

cron.schedule('0 9 * * 1-5', () => {
    console.log('Sending menu to subscribers...');
    sendMenuToSubscribers();
});

bot.start();
