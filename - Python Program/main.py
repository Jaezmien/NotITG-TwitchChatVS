# Load sensitive data
from dotenv import load_dotenv
load_dotenv()

import os

##############################
# Do Twitch connection
import twitch
import math
from datetime import timedelta
helix = twitch.Helix(
    os.getenv("CLIENTID"),
    use_cache=True,
    cache_duration=timedelta(minutes=10)
)
print("Logged in to Twitch!")

start_voting = False
start_mod_voting = False
has_voted = []
vote_status = [0,0,0,0,0]
def handle_message(message: twitch.chat.Message):
    global start_voting
    global has_voted
    global vote_status
    if message.text == "!ping":
        #message.chat.send('Pong!')
        pass
    else:
        if start_voting and message.text.startswith("!vote "):
            if not (message.sender in has_voted):
                vote_num = int( message.text[ len("!vote "): ] )
                if not math.isnan( vote_num ) and (vote_num >= 1 and vote_num <= 5):
                    #print( f"{ message.sender } voted { vote_num } ")
                    has_voted.append( message.sender )
                    vote_status[ vote_num-1 ] += 1
                    WriteNotITG( [1, 1, vote_num, vote_status[vote_num-1]] )
def voting_clean(msg = ""):
    global live_chat
    global has_voted
    global vote_status
    global start_voting
    global start_mod_voting

    live_chat.send(msg)
    has_voted = []
    vote_status = [0,0,0,0,0]
    start_voting = False
    start_mod_voting = False

live_chat = twitch.Chat(
    channel="#jaezmien",
    nickname="SweetieBot",
    oauth=os.getenv("OAUTH"),
    helix=helix
)
live_chat.subscribe( handle_message )
print("Connected to Twitch chat!")

##############################
# Do NotITG connection
import notitg as NITGEXT
show_heartbeat_message = False
unknown_nitg_filename = False

## EXIT CODE
import signal, os, sys
import random

cont_exit = False
def final_exit():
    global cont_exit
    global sched
    global helix
    if sched.running:
        sched.shutdown(wait=False)
    del helix
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

## NOTITG EXTERNAL
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
    global vote_status
    global voting_clean
    global has_voted
    if buffer[0] == 8: # Operator
        if buffer[1] == 1: # Reset votes
            voting_clean("Panic button was pressed! Any current votes are discarded.")
    elif buffer[0] == 1: # Lobby
        if buffer[1] == 1: # Enable Voting
            live_chat.send("Voting has started! Send [!vote #] to vote. (Only once per user)");
            start_voting = True
        elif buffer[1] == 2: # Finish Voting
            live_chat.send("Voting has ended!");
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
            # Case 2: Tie
            elif tie_check[0] == tie_check[1]:
                # Get index of highest votes
                indexes = []
                for i in range(0, len(vote_status)):
                    if vote_status[i] == tie_check[0]:
                        indexes.append(i+1)
                        break
                choice = random.choice(indexes)
                WriteNotITG( [1,2, choice] ) # Grab random
            # Case 3: No one voted
            elif ( vote_status[0] + vote_status[1] + vote_status[2] + vote_status[3] + vote_status[4] ) == 0:
                WriteNotITG( [1,2, random.randint(1,5)] )
            else:
                WriteNotITG( [1,2, random.randint(1,5)] )

            has_voted = []
            vote_status = [0,0,0,0,0]
        elif buffer[1] == 3: # Force vote
            vote_status[ buffer[2]-1 ] = 99
    elif buffer[0] == 2: # Gameplay
        if buffer[1] == 1: # Enable mod voting
            print("Mod casting has been enabled! Syntax: [!mod (percent) (name)] / [!mod switcheroo_(ldur combination)]")
            pass # TODO: Easy way of whitelisting/blacklisting mods

## NOTITG HANDLER
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
    global rpc_nitg_version
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
#tick_job = sched.add_job(TickNotITG, 'interval', seconds=0.1, id='Tick') # Will fuck up if it the function is slow
sched.start()
while not cont_exit:
    TickNotITG()
    time.sleep(0.1)