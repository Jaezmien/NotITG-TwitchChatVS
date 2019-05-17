/*

[]================▄███▄================[]
||               ██▀▀██▌▒              ||
||              ▐█▌ ▒▐██ ▒             ||
||              ██ ▒ ▐██ ▒             ||
||              ██   ██▌ ▒             ||
||              ██  ██▌ ▒              ||
||              ▀ ▄██▌ ▒               ||
||              ▄███▌ ▒                ||
||             ████  ▒▒▒▒▒             ||
||            ████ ■ ▄▄▄  ▒            ||
||           ████  ▄█████▄ ▒           ||
||          ████  ████████▄ ▒          ||
||         ▄███  ▐██▀   ███ ▒          ||
||         ████ ▒ █▌ █▌  ██▌ ▒         ||
||         ████   ▐█ ▐█  ██ ▒          ||
||          ████   ▐▌ █▌▐█▌▒           ||
||.          ▀████▄  ▄▐█ ▌ ▒           ||
||          ▒   ▀▀████ █▌ ▒            ||
||.          ▒▒▒       ▐█ ▒         .  ||
||.    .        ▒▒▒▒▒▒▒ █▌ ▒     .    .||
||  .     .   .        .▐█ ▒    .      ||
||. .. .        .   .    █▌ ▒ .   . . .||
||....  .  .   ▄██▄.   . ▐█ ▒  . .  ...||
||:.....  .   █████▌▒ .. █▌ ▒.  . ....:||
||:::...... . █████▌▒ ..▐█ ▒. ......:::||
||::;::.:.. .. ███▌ ...▄█▌ ▒....:.:::::||
[]==============▀███████▀==============[]


"fuck you im melody"
- Vinyla Jaezmien Gael (2019)

*/

// Import important module
let memoryjs = require('memoryjs')      // https://github.com/Rob--/

// Only use official released versions.
const NotITG_Versions = {

    // Only access GetShaderFlag/SetShaderFlag + Num
    /*

        Explenation on how this works:
            So, [Get/Set]ShaderFlag acts exactly like a flag.
            Think of it as a bit that you can set to 0-9.

            And using [Get/Set]ShaderFlagNum. We essentially have GetExternal/SetExternal.
            But with some limitations, as we only have 10 index with 10 possible values.
            Honestly, I think that's enough.

        Oh and also, the default address stated is the index 0.
        Offset the address by 4 to access the other index.




        P.S. Thank you Taro for making the address for these global. This makes everything easier :D

    */
    "V1": {
        "BuildAddress": 0x006AED20,
        "Address": 0x00896950,
        "BuildDate": 20161224,
    },
    "V2": {
        "BuildAddress": 0x006B7D40,
        "Address": 0x008A0880,
        "BuildDate": 20170405,
    },


    // Only access GetExternal / SetExternal
    "V3": {
        "BuildAddress": 0x006DFD60,
        "Address": 0x008CC9D8,
        "BuildDate": 20180617,
    },
    "V3.1": {
        "BuildAddress": 0x006E7D60,
        "Address": 0x008BE0F8,
        "BuildDate": 20180827,
    },

}
const NotITG_Files = {
    // These are the default filenames.

    "V1"  : "NotITG.exe",         // V1
    "V2"  : "NotITG-170405.exe",  // V2
    "V3"  : "NotITG-V3.exe",      // V3
    "V3.1": "NotITG-V3.1.exe",    // V3.1
}

class NotITG {

    constructor(version,process) {
        this.version = version
        this.process = process
        
        this.details = NotITG_Versions[this.version]

        //
        if(version == "V1" || version == "V2") {

            NotITG.prototype.SetExternal = function(index,flag) {
                index = index || 0;
                // Errors
                if( !(index >= 0 && index <= 9) ) {
                    throw new Error("Index should be 0-9! Got " + index)
                }
                if( !(flag >= 0 && flag <= 9) ) {
                    throw new Error("Flag should be 0-9! Got " + flag)
                }
                //
                memoryjs.writeMemory(process.handle, this.details.Address + (index * 4), flag, memoryjs.INT)
            }
            NotITG.prototype.GetExternal = function(index) {
                index = index || 0;
                // Errors
                if( !(index >= 0 && index <= 9) ) {
                    throw new Error("Index should be 0-9! Got " + index)
                }
                //
                return memoryjs.readMemory(process.handle, this.details.Address + (index * 4), memoryjs.INT)
            }

        } else {

            NotITG.prototype.SetExternal = function(index,flag) {
                index = index || 0;
                // Errors
                if( !(index >= 0 && index <= 63) ) {
                    throw new Error("Index should be 0-63! Got " + index)
                }
                if( !(flag >= -2,147,483,648 && flag <= 2,147,483,647) ) {
                    throw new Error("Flag should be around the 4 bytes limit! Got " + flag)
                }
                //
                memoryjs.writeMemory(process.handle, this.details.Address + (index * 4), flag, memoryjs.INT)
            }
            NotITG.prototype.GetExternal = function(index) {
                index = index || 0;
                // Errors
                if( !(index >= 0 && index <= 63) ) {
                    throw new Error("Index should be 0-63! Got " + index)
                }
                //
                return memoryjs.readMemory(process.handle, this.details.Address + (index * 4), memoryjs.INT)
            }

        }
        //

    }

}




function _SCANSIMPLE() {
    let result = null

    memoryjs.getProcesses((error, processes) => {
        if(error !== null) {

            for(var process in processes) {
                for(var key in NotITG_Files) {

                    if(NotITG_Files[key] === processes[process].szExeFile) {
    
                        result = {"version": key, "process": processes[process]}
                        return

                    }
    
                }
            } 

        }
    })

    return result
}
function _SCANMED(fileName) {
    let result = null

    memoryjs.getProcesses((error, processes) => {
        if(error !== null) {

            for(var process in processes) {
                if(fileName === processes[process].szExeFile) {
    
                    result = processes[process]
                    return

                }
            } 

        }
    })

    return result
}

module.exports.Scan = function(fileName) {

    // Default file name (simple detection)
    if(fileName === undefined) {

        let res = _SCANSIMPLE()

        if( res === null ) {
            throw new Error("Cannot find application!")
        } else {
            return new NotITG(res.version, memoryjs.openProcess(res.process.th32ProcessID))
        }

    }

    // Custom file name (harder detection)
    else {

        // Build not defined
        if(typeof filename === String) {

            if (!filename.endsWith('.exe')) {
                filename += '.exe'
            }
            let res = _SCANMED(fileName);

            if( res === null ) {
                throw new Error("Cannot find application!")
            } else {
                let proc = memoryjs.openProcess(res.th32ProcessID);
                let ver = "";
                // Detect build number
                for(var key in NotITG_Versions) {

                    if (memoryjs.readMemory(process.handle, NotITG_Versions[key].BuildAddress, memoryjs.INT) == NotITG_Versions[key].BuildDate) {

                        ver = key;
                        break

                    }

                }

                return new NotITG(ver, memoryjs.openProcess(res.th32ProcessID))
            }

        }

    }
}