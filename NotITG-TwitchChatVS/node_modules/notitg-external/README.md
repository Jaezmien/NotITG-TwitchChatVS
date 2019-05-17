# NotITG-External
why?
im too lazy to set up a websocket server on C# :P
-----------
### Setup
```javascript
const NotITG-External = require('notitg-external')
let NotITG = NotITG-External.Scan()
```
If you have a custom file name for NotITG. Type in the filename as the first parameter.
Note that this will not work for non-public builds.

Furthermore, this function will only get the first process it detects.
(Might change in the future, but this will do for now)

### Functions
##### .SetExternal(int index, int flag)
Index is limited to 0-9 for NotITG V1-V2, 0-63 for V3-V3.1
Flag is limited to 0-9 for NotITG V1-V2 and the 4 bytes limit for V3-V3.1

##### .GetExternal(int index)
See: SetExternal

### Variables
##### .Version
This will return the version of NotITG you're using (`V1`,`V2`,`V3`,`V3.1`,etc)

##### .Process
See: MemoryJS' Process (https://github.com/Rob--/memoryjs/wiki/Process)

##### .Details
This contains three variables.
**BuildAddress**, **Address** and **BuildDate**.
Example:
```javascript
NotITG.Details.BuildDate // will return the date of when the version was built
```