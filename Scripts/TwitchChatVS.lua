TwitchChatVS = {

    HasStarted = false, -- If beyond Start Game

    IsConnected = false,
    Flag = 71747, -- used to identify which application is speaking

	VotingTime = 30,
	QueueLimit = 6,
	Volume = 69,

	-- Profile
	ValidateProfile = function()
		local p = PROFILEMAN:GetMachineProfile():GetSaved().TwitchChatVS or {}
		local t = {'VotingTime', 'QueueLimit', 'Volume'}
		for _,v in pairs( t ) do
			if not p[v] then print(v); return false end
		end
		return true
	end,
	LoadProfile = function()
		local p = TwitchChatVS.GetProfile()
		TwitchChatVS.VotingTime = p.VotingTime
		TwitchChatVS.QueueLimit = p.QueueLimit
		TwitchChatVS.Volume = p.Volume
	end,
	GetProfile = function(reset)
		local p = PROFILEMAN:GetMachineProfile():GetSaved()
		if not p.TwitchChatVS or reset or not TwitchChatVS.ValidateProfile() then
			p.TwitchChatVS = {
				VotingTime = 30,
				QueueLimit = 6,
				Volume = 69,
			}
		end
		return p.TwitchChatVS
	end,
	SetProfile = function()
		TwitchChatVS.LoadProfile()
		PROFILEMAN:SaveMachineProfile()
	end,

	-- Menu Options
	VotingTimeOption = function()
		local p = TwitchChatVS.GetProfile()
		local function display( text )
			text:settext( p.VotingTime )
		end
		local function move(pn,dir,cnt)
			p.VotingTime = math.max(
				AddSnap( p.VotingTime, dir , cnt , { 1,2,5 } ), 10
			)
		end
		return SliderOption('Voting Time', move, display, true)
	end,
	QueueLimitOption = function()
		local p = TwitchChatVS.GetProfile()
		local function display( text )
			text:settext( p.QueueLimit )
		end
		local function move(pn,dir,cnt)
			p.QueueLimit = math.max(
				AddSnap( p.QueueLimit, dir , cnt , { 1,2,5 } ), 6
			)
		end
		return SliderOption('Queue Limit', move, display, true)
	end,
	PreviewVolume = function()
		local p = TwitchChatVS.GetProfile()
		local function display( text )
			text:settext( p.Volume )
		end
		local function move(pn,dir,cnt)
			local val = AddSnap( p.Volume, dir , cnt , { 1, 5, 25 } )
			p.Volume = math.max( math.min( val, 100 ), 0 )
		end
		return SliderOption('Preview Volume', move, display, true)
	end,

	SelectedSong = nil,
	SelectedDifficulty = 1,
	IsModded = {false, false, false, false, false},
	SongDifficulties = {},
	LobbySongs = {nil, nil, nil, nil, nil},
	EnableModVoting = false,
	SpeedMod = 2.5,
	LobbyActors = {},

	GameQueue = {},
	ActivatedMods = {},

}

TwitchChatVS.LoadProfile()