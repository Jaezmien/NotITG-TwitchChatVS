TwitchChatVS = {
    isConnected = function() return GAMESTATE:GetExternal(63)==1 end,

    clearedShit = false,

    --

    flag = 71747, -- used to identify which application is speaking

    ConnectScreen = {
        lastSeenState = false,
    },
    VotingScreen = {
        votingTime = 30, -- default voting time length
    },
}