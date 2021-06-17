COMMAND_PREFIXES = ['!','.','$','+','-','~']

# Load sensitive data
import configparser
config = configparser.ConfigParser()
config.read('config.ini')

import os
import sys
if not os.path.exists('config.ini'):
	config['Config'] = {
		'OAuth':'<Use [https://twitchapps.com/tmi/] to get your chat OAuth>',
		'StreamName': '<Your twitch name, lowercased>'
	}
	config.write( open('config.ini', 'w') )
	sys.exit("Config.init file not found, exiting program and creating ini file.")
TOKEN_LIMIT = int( config['Config']['TokenLimit'] )

# Load whitelist
import json
with open('whitelist.json','r') as json_file:
	data = json.load( json_file )

##############################
# Do Twitch connection
import twitch
import math
import re
from datetime import timedelta

start_voting = False
start_mod_voting = False
has_voted = []
has_mod_voted = {}
vote_status = [0,0,0,0,0]

live_chat = twitch.Chat(
	channel=f"#{ (config['Config']['StreamName'].lower()) }",
	nickname="TwitchChatVS",
	oauth=config['Config']['OAuth']
)

def validate_modstring( mod_string: str ):
	if re.search(r'\d$', mod_string):
		column = int( re.search(r'\d$', mod_string).group() )
		return (re.sub(r'\d$','',mod_string) in data) and ( column >= 0 and column <= 3 )
	elif mod_string in data:
		return True
	else:
		return False

def get_uncolumed_modstring( mod_string: str ):
	if re.search(r'\d$', mod_string):
		return re.sub(r'\d$','',mod_string)
	return mod_string

def parse_mod(mod_percent: int, mod_string: str, message: twitch.chat.Message):
	global data

	mod_actual_string = mod_string

	# Check if column-specific mod is still valid
	if re.search(r'\d$', mod_string):
		new_mod_string = re.sub(r'\d$','',mod_string)
		if not "enableColumnSpecific" in data[ new_mod_string ]:
			live_chat.send('@' + message.sender + ' - Forbidden mod!')
			return
		mod_string = new_mod_string
	else:
		if "onlyColumnSpecific" in data[ mod_string ]:
			live_chat.send('@' + message.sender + ' - Forbidden mod!')
			return

	if not math.isnan( mod_percent ) and mod_string in data:
		mod_range = data[ mod_string ]['range']

		# Mods that modify other mods
		if not "nonzeroPercentage" in data[ mod_string ]:
			mod_percent = max( min(mod_range[1], mod_percent) , mod_range[0] )

		# Forbidden ranges
		if "disableRange" in data[ mod_string ]:
			disabled_percentage = data[ mod_string ]['disableRange']
			if mod_percent >= disabled_percentage[0] and mod_percent <= disabled_percentage[1]:
				live_chat.send('@' + message.sender + ' - Forbidden mod percentage!')
				return

		mod_string_buffer = encode_string(mod_actual_string)
		mod_isNegative = 1 if mod_percent < 0 else 0
		send_buffer = [2, 1, abs(mod_percent), mod_isNegative] + mod_string_buffer
		WriteNotITG( send_buffer )
	else:
		live_chat.send('@' + message.sender + ' - Forbidden mod!')
		return

def handle_message(message: twitch.chat.Message):
	global start_voting
	global has_voted
	global has_mod_voted
	global vote_status

	if message.text[0] in COMMAND_PREFIXES:
		cmd = message.text[1:]
		if cmd == "ping":
			pass
		elif cmd in ['docs','modlist','help','cmds','commands']:
			live_chat.send("❓ Here's the link to the mods list - https://kutt.it/TCVSBMod")
		else:
			if start_voting and cmd.startswith("vote "):

				if not (message.sender in has_voted):
					try:
						vote_num = int( cmd[ len("vote "): ] )
					except:
						live_chat.send('@' + message.sender + ' - Invalid vote number!')
						return

					if not math.isnan( vote_num ) and (vote_num >= 1 and vote_num <= 5):
						has_voted.append( message.sender )
						vote_status[ vote_num-1 ] += 1
						WriteNotITG( [1, 1, vote_num, vote_status[vote_num-1]] )
					else:
						live_chat.send('@' + message.sender + ' - Invalid vote range!')
						return
				else:
					live_chat.send('@' + message.sender + ' - You have already voted!!')

			elif start_mod_voting and cmd.startswith("mod "): # ( !mod [percent] [mod] )

				if TOKEN_LIMIT != 0:
					if not (message.sender in has_mod_voted):
						has_mod_voted[message.sender] = 0

					if has_mod_voted[message.sender] > TOKEN_LIMIT:
						live_chat.send('@' + message.sender + ' - You have used up all tokens!')
						return
					has_mod_voted[message.sender] += 1

				vote_str = cmd[ len("mod "): ].split(' ')
				if len(cmd[ len("mod "): ].split(' ')) == 2:
					try:
						mod_percent = int( vote_str[0].replace('%','') )
					except:
						live_chat.send('@' + message.sender + ' - Invalid integer mod percentage!')
						return
					mod_string = vote_str[1].lower()

					if not validate_modstring( mod_string ):
						live_chat.send('@' + message.sender + ' - Forbidden mod!')
						return

					parse_mod( mod_percent, mod_string, message )
							
				elif len(cmd[ len("!mod "): ].split(' ')) == 1: # ( !mod [mod] )
					mod_string = vote_str[0].lower()
					
					if not validate_modstring( mod_string ):
						live_chat.send('@' + message.sender + ' - Forbidden mod!')
						return

					__mod_string = get_uncolumed_modstring( mod_string )
					mod_percent = 100
					if "defaultPercentage" in data[ __mod_string ]:
						mod_percent = data[ __mod_string ][ "defaultPercentage" ]

					parse_mod( mod_percent, mod_string, message )

def voting_clean(msg = ""):
	global live_chat
	global has_voted
	global has_mod_voted
	global vote_status
	global start_voting
	global start_mod_voting

	if msg:
		live_chat.send(msg)
	has_voted = []
	has_mod_voted = {}
	vote_status = [0,0,0,0,0]
	start_voting = False
	start_mod_voting = False

live_chat.subscribe( handle_message )
print("Connected to Twitch chat!")

##############################
# Do NotITG connection
import notitg as NITGEXT
show_heartbeat_message = False
unknown_nitg_filename = False

#region Exit Code
import signal, os, sys
import random

cont_exit = False
def final_exit():
	global cont_exit
	global sched
	global helix
	if sched.running:
		sched.shutdown(wait=False)
	print('Exited!')
	os._exit(0)
def handler(signum, frame): 
	global has_notitg
	if has_notitg:
		print('🚀  Disconnecting NotITG...')
		WriteNotITG([0,2])
	else:
		final_exit()
	
# Set the signal handler
signal.signal(signal.SIGINT, handler)
#endregion

#region NotITG External
encode_guide = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 \n'\"~!@#$%^&*()<>/-=_+[]:;.,`{}"
notitg_appid = 71747
rpc_song_name = None
rpc_folder_name = None
rpc_length = None
def encode_string(str):
	buff = []
	for i in range(len(str)):
		buff.append( encode_guide.find(str[i]) )
	return buff
def decode_buffer(buff):
	str = ""
	for x in buff:
		str += encode_guide[x - 1]
	return str
rpc_screen = None
def notitg_onRead(buffer):
	global start_voting
	global start_mod_voting
	global vote_status
	global voting_clean
	global has_voted
	if buffer[0] == 8: # Operator
		if buffer[1] == 1: # Reset votes
			voting_clean("⚠ Panic button was pressed! Any current votes are discarded.")
	elif buffer[0] == 1: # Lobby
		if buffer[1] == 1: # Enable Voting
			live_chat.send("🗳 Voting has started! Send [!vote #] to vote. (Only once per user)");
			voting_clean("");
			start_voting = True
			start_mod_voting = False
		elif buffer[1] == 2: # Finish Voting
			live_chat.send("🗳 Voting has ended!");
			start_voting = False

			tie_check = vote_status.copy() # Descending
			tie_check.sort( reverse=True )

			# Case 1: Only one vote
			if tie_check[0] != tie_check[1]:
				# Get index of highest voted
				index = -1
				for i in range(0, len(vote_status)):
					if vote_status[i] == tie_check[0]:
						index = i
						break
				WriteNotITG( [1,2, index+1] )
			# Case 2: No one voted
			elif ( vote_status[0] + vote_status[1] + vote_status[2] + vote_status[3] + vote_status[4] ) == 0:
				WriteNotITG( [1,2, random.randint(1,5)] )
			# Case 3: Tie
			elif tie_check[0] == tie_check[1]:
				# Get index of highest votes
				indexes = []
				for i in range(0, len(vote_status)):
					if vote_status[i] == tie_check[0]:
						indexes.append(i+1)
						break
				choice = random.choice(indexes)
				WriteNotITG( [1,2, choice] ) # Grab random
			else:
				print('Something went wrong in the case handler!')
				WriteNotITG( [1,2, random.randint(1,5)] )

			has_voted = []
			vote_status = [0,0,0,0,0]
		elif buffer[1] == 3: # Force vote
			vote_status[ buffer[2]-1 ] = 999 # This seems like a bad idea... let's see what happens.
	elif buffer[0] == 2: # Gameplay
		if buffer[1] == 1: # Enable mod voting
			start_mod_voting = True
			live_chat.send("📢 Mod casting has been enabled! Syntax: [!mod (percent) (name)]")
	elif buffer[0] == 3: # Eval
		if buffer[1] == 1: # Finished Song
			if start_mod_voting:
				live_chat.send("🏁 Song has finished!") # Only send if accepting mods
			start_mod_voting = False
#endregion

#region NotITG Handler
import time
import textwrap # just because
from apscheduler.schedulers.background import BackgroundScheduler
sched = BackgroundScheduler()
nitg: NITGEXT.NotITG = None
has_notitg = False
notitg_writeBuffer = []
notitg_readBuffer = []

# https://stackoverflow.com/a/312464
def chunks(lst, n):
	for i in range(0, len(lst), n):
		yield lst[i:i + n]

def WriteNotITG(buffer):
	global notitg_writeBuffer
	if len( buffer ) <= 26:
		notitg_writeBuffer.append({
			"buffer": buffer,
			"set": 0,
		})
	else:
		buffer_chunks = list( chunks(buffer, 26) )
		for i in range(len(buffer_chunks)):
			notitg_writeBuffer.append({
				"buffer": buffer_chunks[i],
				"set": 2 if len(buffer_chunks) == (i+1) else 1
			})
def TickNotITG():
	global has_notitg
	global nitg
	global notitg_readBuffer
	global notitg_writeBuffer
	if has_notitg:
		if nitg.GetExternal(57)==1 and nitg.GetExternal(59)==notitg_appid:
			read_buffer = []
			
			for i in range(28,28 + nitg.GetExternal(54)):
				read_buffer.append(nitg.GetExternal(i))
				nitg.SetExternal(i,0)
			
			if nitg.GetExternal(55) == 0:
				notitg_onRead( read_buffer )
			else:
				notitg_readBuffer.extend( read_buffer )
				if nitg.GetExternal(55) == 2:
					notitg_onRead( notitg_readBuffer )
					notitg_readBuffer.clear()

			nitg.SetExternal(54,0)
			nitg.SetExternal(55,0)
			nitg.SetExternal(59,0)
			nitg.SetExternal(57,0)
		if len( notitg_writeBuffer ) > 0 and nitg.GetExternal(56)==0:
			nitg.SetExternal(56,1)
			write_buffer = notitg_writeBuffer.pop(0)
			index = 0
			for x in write_buffer['buffer']:
				nitg.SetExternal( index , x )
				index += 1 # No i++ but i'll take it
			nitg.SetExternal(26,len(write_buffer['buffer']))
			nitg.SetExternal(27,write_buffer['set'])
			nitg.SetExternal(56,2)
			nitg.SetExternal(58,notitg_appid)

			if write_buffer['buffer'][0]==0 and write_buffer['buffer'][1]==2:
				final_exit()
def HeartbeatNotITG():
	global has_notitg
	global nitg
	if has_notitg:
		if NITGEXT.Heartbeat(nitg):
			if show_heartbeat_message: print('💓  Successfully heartbeated NotITG!')
		else:
			has_notitg = False
			print('⚠️  Cannot heartbeat NotITG. Retrying in 5 seconds.')
			voting_clean("NotITG has exited/crashed. Any current votes are discarded.")
	else:
		try:
			nitg = NITGEXT.Scan( not unknown_nitg_filename )
			if nitg.version == "V1" or nitg.version == "V2":
				print('⚠️  Unsupported NotITG version. Found: {0}, expected V3 or higher. Retrying in 5 seconds.'.format(nitg.version))
			elif nitg.GetExternal(60)==0:
				print('⌛  NotITG found, but still initializing. Retrying in 5 seconds.')
			else:
				print(textwrap.dedent("""\
					✔️  NotITG Found!
					> -------------------------------
					>>  Version: {0}
					>>  Build Date: {1}
					> -------------------------------""".format(nitg.version,nitg.details['BuildDate'])))
				has_notitg = True
				time.sleep(0.5)
				WriteNotITG([0,1])
		except NITGEXT.NotITGError:
			print('⚠️  Can\'t find NotITG, retrying in 5 seconds.')
sched.add_job(HeartbeatNotITG, 'interval', seconds=5, id='Heartbeat')
if unknown_nitg_filename:
	print('❗  Brute-forcing detection!')
HeartbeatNotITG()

# Will fuck up if it the function is slow
# tick_job = sched.add_job(TickNotITG, 'interval', seconds=0.1, id='Tick')

sched.start()
while not cont_exit:
	TickNotITG()
	time.sleep(0.1)
#endregion