/*

    yo

    put your twitch username here

*/
const twitchUsername = ''

// and then go here: https://twitchapps.com/tmi
// and paste the oauth token here
const twitchOAuth = ''

// cool? ok
// you can also change some settings here

// this is the token limit of each user
// they can't put more mods after this
// no exception
const tokenLimit=5;

// disable heartbeat message (if you want to, nothing's gonna break, it'll only show error messages)
const disableHeartBeatMSG=true

// idk why but
const disableModVoting=false

// eh, might not get used, will dm to the user on invalid command
const notifyOnInvalidModCommand=false








// ok nice
// now dont touch these stuffs
// they're bound by black magic and flex tape
// but im not sure that they'll hold on


/*

    cow's to-do someday list:
        * daikyi's idea of (vote on a pre-determined set of mods)

*/

const chalk = require('chalk');
let notitgexternal = require('notitg-external')
let tmi = require('tmi.js')
let memoryjs = require('memoryjs')

let fs = require('fs')
let _modRules = JSON.parse(fs.readFileSync('mods/mods_rules.json'));
let modRules = {
    "allowed": [],
    "allowedR": [],
    "disabled": [],
    "disabledR": [],
    "special": {},
}

// Parse Mod Rules \\
_modRules["disabled"].forEach(x=>{
    modRules["disabled"].push(x)
});
_modRules["disabledREGEX"].forEach(x=>{
    modRules["disabledR"].push(new RegExp("^("+x+")$",'g'))
})
_modRules["allowed"].forEach(x=>{
    modRules["allowed"].push(x)
})
_modRules["allowedREGEX"].forEach(x=>{
    modRules["allowedR"].push(new RegExp("^("+x+")$",'g'))
})
Object.keys(_modRules["allowSpecialCase"]).forEach(x=>{
    let v = _modRules["allowSpecialCase"][x];
    //
    modRules["special"][x]=v;
})


// this is the one you'll be using
function sanitizeMod(mod,perc) {

    perc = Math.round(perc)

    if(modRules["allowed"].includes(mod)) {
        return { "mod": mod , "percent": Math.max(Math.min(perc,250),-250) }
    }

    for(var k in modRules["allowedR"]) {
        var x = modRules["allowedR"][k]
        if(x.test(mod)==true) {
            return { "mod": mod , "percent": Math.max(Math.min(perc,250),-250) }
        }
    }

    let okmr = Object.keys(modRules["special"])
    for(var k in okmr) {
        let x = okmr[k];
        let v = modRules["special"][x];
        let r = new RegExp("^("+x+")$",'g');
        //
        if(r.test(mod)==true) {
            return { "mod": mod , "percent": Math.max(Math.min(perc,v["maxCap"]),v["minCap"]) }
        }
    }

    return null;

}
function sanitizeSwitcheroo(mod) {

    let r = new RegExp("^(switcheroo_(ldur|rudl|dlru|ludr|rdul|drlu|ulrd|urld))$",'g');
    if(r.test(mod)==true) {
        let s = mod.replace('switcheroo_','')
        let sw = {
            "ldur": [0,0],
            "rudl": [100,0],
            "dlru": [0,100],
            "ludr": [25,-75],
            "rdul": [75,75],
            "drlu": [25,125],
            "ulrd": [75,-125],
            "urld": [100,-100],
        }
        return {
            "mod": "switcheroo",
            "flip": sw[s][0],
            "invert": sw[s][1]
        }
    }

    return null;

}

//--\\
var isConnected = false
var castVoting = false

var voting = [
    0,0,0,0,0
];
var hasVoted = [];
var modVote = {};
var castModVoting=false;

var modQueue = [];

function tick() {

    try {

        if( NotITG != null ) {

            if(NotITG.GetExternal(0)==71747) {

                // is application sending shit
                if(NotITG.GetExternal(1)==1) {
        
                    // connecting
                    if(NotITG.GetExternal(62)==1) {
        
                        isConnected=!isConnected
                        NotITG.SetExternal(63,isConnected?1:0)
                        NotITG.SetExternal(1,2)
                        NotITG.SetExternal(62,0)
        
                        console.log(chalk.green.bold( (isConnected ? "Connected" : "Disconnected") + " with NotITG!" ))
        
                    }            
    
                    // voting
                    if(NotITG.GetExternal(2)==1) {
                        if(NotITG.GetExternal(3) == 1) {
    
                            voting = [0,0,0,0,0];
                            hasVoted = [];
                        
                            Twitch.say(twitchUsername,"Voting has started! Send [!vote #] to vote. (Only once per user)");
                            castVoting = true;
                            NotITG.SetExternal(1,0)
                            NotITG.SetExternal(2,0)
                            NotITG.SetExternal(3,0)
        
                        }else if(NotITG.GetExternal(3) == 2) {
    
                            Twitch.say(twitchUsername,"Voting has ended!")
                            castVoting = false;
                            NotITG.SetExternal(1,2) // recieve
                            NotITG.SetExternal(2,1) // is message
                            NotITG.SetExternal(3,1) // voting screen
                            NotITG.SetExternal(4,3) // finish voting on client
                            
                            
    
                            // no votes
                            if(JSON.stringify(voting) == JSON.stringify([0,0,0,0,0])) {
    
                                var item = Math.floor(Math.random() * 5 + 1)
    
                                NotITG.SetExternal(5,item) // which song has been voted
    
                            } else {
                                // check if its a tie
                                let tieSongs = 0;
                                let hiSongNum = 0;
                                for(let i=1;i<=5;i++) {
                                    if(voting[i-1]>hiSongNum) {
                                        hiSongNum=voting[i-1];
                                    }
                                }
                                voting.forEach(x => {
                                    if(x == hiSongNum) {
                                        tieSongs+=1;
                                    }
                                })
                                
                                // is tie
                                if(tieSongs>1) {
                                    let ts = [];
                                    for(let i=1;i<=5;i++) {
                                        if(hiSongNum==voting[i-1]) {
                                            ts.push(i);
                                        }
                                    }
                                    //
                                    var item = ts[Math.floor(Math.random()*ts.length)];
                                    NotITG.SetExternal(5,item) // which song has been voted
                                }
                                // not tie
                                else {
                                    let songNum = 0;
                                    for(let i=1;i<=5;i++) {
                                        if(voting[i-1]==hiSongNum) {
                                            songNum=i;
                                        }
                                    }
                                    NotITG.SetExternal(5,songNum) // which song has been voted
                                }
                            }
    
                        }else if(NotITG.GetExternal(3) == 3) {
    
                            NotITG.SetExternal(5,NotITG.GetExternal(4))
    
                            Twitch.say(twitchUsername,"Game master has overridden the voting!")
                            castVoting = false;
                            NotITG.SetExternal(1,2) // recieve
                            NotITG.SetExternal(2,1) // is message
                            NotITG.SetExternal(3,1) // voting screen
                            NotITG.SetExternal(4,3) // finish voting on client
                            
    
                        }
                    }
    
                    // game
                    if(NotITG.GetExternal(2)==2 && !disableModVoting) {
                        if(NotITG.GetExternal(3) == 1) {
    
                            modQueue = [];
                            modVote = {};
                        
                            Twitch.say(twitchUsername,"Mod casting has been enabled! Syntax: [!mod (percent) (name)] / [!mod switcheroo_(ldur combination)]");
                            castModVoting = true;
                            NotITG.SetExternal(1,0)
                            NotITG.SetExternal(2,0)
                            NotITG.SetExternal(3,0)
        
                        }else if(NotITG.GetExternal(3) == 2) {
    
                            Twitch.say(twitchUsername,"Song has finished!");
                            modQueue = [];
                            modVote = {};
                            castModVoting = false;
                            NotITG.SetExternal(1,0)
                            NotITG.SetExternal(2,0)
                            NotITG.SetExternal(3,0)
    
                        }
                    }
    
                    // reset
                    if(NotITG.GetExternal(61)==1) {
                        Twitch.say(twitchUsername,"Panic button has been pressed! Any current votes are discarded.");
                        modQueue = [];
                        modVote = {};
                        voting = [0,0,0,0,0];
                        hasVoted = [];
                        castVoting = false;
                        castModVoting = false;
                        NotITG.SetExternal(1,0)
                        NotITG.SetExternal(61,0)
                    }
        
                }
        
            }
    
            if(castModVoting==true && modQueue.length>0) {
    
                if(NotITG.GetExternal(1)==0) {
                    
                    let k = modQueue.shift();
    
                    let g = 'abcdefghijklmnopqrstuvwxyz0123456789'
    
                    // char to pos
                    function encodeChar(s) {
                        for (let i = 0; i < g.length; i++) {
                            if(s==g.charAt(i))
                                return i+1;
                        }
                        console.error("oh fuck")
                        return null;
                    }
    
                    
    
                    if(k.mod == "switcheroo") {
    
                        NotITG.SetExternal(3,5); // mods-special (switcheroo)
    
                        NotITG.SetExternal(4,Math.abs(k.flip));
                        NotITG.SetExternal(5,k.flip<0?1:0) // is negative
                        
                        NotITG.SetExternal(6,Math.abs(k.invert));
                        NotITG.SetExternal(7,k.invert<0?1:0) // is negative
    
                        NotITG.SetExternal(2,2) // screen, game
                        NotITG.SetExternal(1,2) // send (nudes)
    
                    } else {
    
                        for (let i = 0; i < k.mod.length; i++) {
                            NotITG.SetExternal(7+i, encodeChar( k.mod.charAt(i) ) )
                        }
    
                        setTimeout(function() {
                            NotITG.SetExternal(3,4); // mods-normal
                            NotITG.SetExternal(5,Math.abs(k.percent));
                            NotITG.SetExternal(6,k.percent<0?1:0) // is negative
    
                            NotITG.SetExternal(4,k.mod.length);
                            NotITG.SetExternal(2,2) // screen, game
                            NotITG.SetExternal(1,2) // send (nudes)
                        },20)
    
                    }
    
                }
    
            }

        }

    } catch(err) {
        console.log(chalk.red.bold('[[[[ ERROR - tick() ]]]]'));
        console.log(err)
        console.log(chalk.red.bold('[[[[ ok cool. yeet that message to melody, or not, im just a message ]]]]'))
    }

}
var done = (function wait () { if (!done) { tick(); setTimeout(wait, 20) } })();

var hasNITG = false;
function NotITGHeartbeat() {

    if(hasNITG) {
        try {
            if(NotITG === null) {
                isConnected = false;
                hasNITG = false;
                return;
            }
            let yea = false;
            memoryjs.getProcesses((error, processes) => {
                if(error !== null) {
        
                    for(var process in processes) {
                        if(processes[process].th32ProcessID == NotITG.process.th32ProcessID) {
                            let d = new Date();
                            if(!disableHeartBeatMSG) {
                                console.log(chalk.green.bold("NotITG Heartbeat Successful ("+d.toTimeString().split(' ')[0]+")"))
                            }
                            hasNITG=true;
                            yea = true
                            return;
                        }
                    } 
        
                }
            })
            if(!yea) {
                console.log(chalk.red.bold("Error in heartbeat, disconnecting."))
                NotITG = null;
                isConnected = false;
                hasNITG = false;
                //
                modQueue = [];
                modVote = {};
                voting = [0,0,0,0,0];
                hasVoted = [];
                castVoting = false;
                castModVoting = false;
                //
                Twitch.say(twitchUsername,"NotITG has exited/crashed. Any current votes are discarded.")
            }
        } catch(err) {
            console.log(chalk.red.bold("Error while trying to heartbeat NotITG V3.1, disconnecting."))
            NotITG = null;
            isConnected = false;
            hasNITG = false;
            //
            modQueue = [];
            modVote = {};
            voting = [0,0,0,0,0];
            hasVoted = [];
            castVoting = false;
            castModVoting = false;
            //
            Twitch.say(twitchUsername,"NotITG has exited/crashed. Any current votes are discarded.")
        }
    } else {
        try {
            console.log(chalk.gray("Trying to connect to NotITG V3.1~"))
            NotITG = notitgexternal.Scan()
            console.log(chalk.green(`[[Connected to NotITG!]]
> ----------------------------
>>   Version: ${ NotITG.version }
>>   Build Date: ${ NotITG.details.BuildDate }
> ----------------------------`))
            hasNITG = true;
        } catch {
            console.log(chalk.red.bold("Error trying to find NotITG V3.1"))
        }
    }

}
var hbdone = (function wait () { if (!hbdone) { NotITGHeartbeat(); setTimeout(wait, 5000) } })(); // heartbeat every 5 second

var NotITG = notitgexternal.Scan();

//--\\

const twitchOptions = {
    options: {
        debug: true,
    },
    connection: {
        reconnect: true,
    },
    identity: {
        username: twitchUsername,
        password: twitchOAuth,
    },
    channels: [twitchUsername]
}
let Twitch = new tmi.client(twitchOptions);

Twitch.on("chat", (channel, userstate, message, self) => {
    if(self) return;
    //
    let m = message.toLowerCase();
    //
    if(m == "!docs") {
        Twitch.say(twitchUsername,"Here's the link to the document for help - http://bit.ly/2KMkIUJ")
        return;
    }
    //
    if(castVoting==true) {
        if(m.startsWith('!vote') && !hasVoted.includes(userstate.username)) {
            try {
                let n = parseInt(m.replace('!vote ',''));
                if(n>=1 && n<=5) {
                    voting[n-1]++;
                    hasVoted.push(userstate.username);
                    //
                    NotITG.SetExternal(1,2) // recieve
                    NotITG.SetExternal(2,2) // isVote
                    NotITG.SetExternal(3,n) // vote num
                    NotITG.SetExternal(4,voting[n-1]) // amt of votes
                }
            } catch {
                // ya fucked up
            }
        }
    }
    if(castModVoting==true) {
        if(m.startsWith('!mod')) {

            if(modVote[userstate.username] == null) {
                modVote[userstate.username] = 1;
            }

            if(modVote[userstate.username] <= tokenLimit || userstate.username == twitchUsername) {
                let n = m.replace('!mod ','').split(' ')
                if(n.length==1 && n[0].startsWith('switcheroo_')) {

                    let m_m = n[0];

                    //

                    let s_m = sanitizeSwitcheroo(m_m);

                    if(s_m != null) {

                        modQueue.push(s_m)

                        console.log(chalk.white(userstate.username + " has enabled " + m_m))

                        //

                        modVote[userstate.username]+=1;

                    }

                } else if(n.length==2 && !isNaN(parseInt(n[0]))) {

                    let m_p = parseInt(n[0]);
                    let m_m = n[1];

                    //

                    let s_m = sanitizeMod(m_m,m_p);

                    // try again
                    if(s_m == null) {
                        chalk.gray("error while trying to detect command, retrying")
                        s_m = sanitizeMod(m_m,m_p);
                    }

                    if(s_m != null) {

                        modQueue.push(s_m)

                        console.log(chalk.white(userstate.username + " has enabled " + m_p + " " + m_m))

                        //

                        modVote[userstate.username]+=1;

                    } else {
                        
                        console.log(chalk.red(userstate.username + "'s command is invalid/rejected - 2. ["+m+"]"))
                        if(notifyOnInvalidModCommand && userstate.username != twitchUsername) {
                            Twitch.whisper(userstate.username,"[TwitchChatVS] - Invalid Mod!");
                        }

                    }

                } else {
                    console.log(chalk.red(userstate.username + "'s command is invalid - 1. ["+m+"]"))
                }
            } else {
                console.log(chalk.blue(userstate.username + " doesn't have any more tokens"))
                if(userstate.username != twitchUsername) {
                    Twitch.whisper(userstate.username,"[TwitchChatVS] - You dont have enough tokens! Wait until the next file.");
                }
            }
            
        }
    }
})

Twitch.connect();
//--\\


// thabks, this is a live-saver (https://stackoverflow.com/a/14032965)
process.stdin.resume();//so the program will not close instantly

function exitHandler(options, exitCode) {
    if (options.cleanup) console.log(chalk.red.dim('EXIT-clean'));
    if (exitCode || exitCode === 0) console.log(chalk.red.dim('EXIT-'+exitCode));
    if (options.exit) {
        if(hasNITG) {
            NotITG.SetExternal(63,0);
            isConnected = false;
            console.log(chalk.green.bold("NotITG Disconnected"))
        }
        process.exit();
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));