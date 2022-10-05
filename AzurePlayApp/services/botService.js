const playerService = require("./playerService");

const _bots = {};
let _accum = 0;

function updateBot(botid, pos, rot) {
    if (!_bots[botid]) {
        return;
    }
    _bots[botid].pos = pos;
    _bots[botid].rot = rot;
}

function createBot() {
    let botid = "bot-"+_accum;
    _accum++;
    _bots[botid] = {
        type: "bot" + Math.floor(Math.random()*4),
        hp: 10,
        fullHp: 10,
        speed: Math.random() * 15,
        pos: [Math.random()*200 - 100, 0.5 , Math.random()*200 - 100],
        rot: [0, 0, 0]
    }
    return _bots[botid]
}

function getAllBots() {
    return _bots
}
function isTargetABot(botid) {
    return _bots[botid]!=null;
}
function hitBot(botid, source) {
    if (!_bots[botid]) {
        return {
            error: "Already died"
        }
    }
    _bots[botid].hp --;
    if (_bots[botid].hp == 0) {
        playerService.addScore(source, Math.floor(_bots[botid].speed))
        removeBot(botid);
        createBot();
        return {
            error: "Already died"
        }
    }
    if (_bots[botid].hp<0) {
        removeBot(botid);
    }
    return "new bot generated";
}
function removeBot(botid) {
    delete _bots[botid];
}
module.exports = {
    updateBot: updateBot,
    createBot: createBot,
    isTargetABot: isTargetABot,
    hitBot: hitBot,
    removeBot: removeBot,
    getAllBots: getAllBots
}