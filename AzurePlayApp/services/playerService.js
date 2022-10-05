const _players = {};

function updatePlayer(pid, pos, rot) {
    if (!_players[pid]) {
        return;
    }
    _players[pid].pos = pos;
    _players[pid].rot = rot;
}

function createPlayer(pid) {
    if (_players[pid]) {
        return {
            error: "Already exists"
        };
    }
    _players[pid] = {
        score: 0,
        hp: 100,
        fullHp: 100,
        pos: [Math.random()*200 - 100, 0.5 , Math.random()*200 - 100],
        rot: [0, 0, 0]
    }
    return _players[pid]
}
function isTargetAPlayer(pid) {
    return _players[pid]!=null;
}
function hitPlayer(pid, source) {
    if (!_players[pid]) {
        return {
            error: "Already died"
        }
    }
    _players[pid].hp --;
    if (_players[pid].hp == 0) {
        addScore(source, 50);
        removePlayer(pid);
        return {
            error: "Already died"
        }
    }
    if (_players[pid].hp < 0) {
        removePlayer(pid);
        return {
            error: "Already died"
        }
    }
    return _players[pid];
}
function getAllPlayers() {
    return _players
}
function removePlayer(pid) {
    delete _players[pid];
}
function addScore(pid, score) {
    console.log(pid, score);
    if (_players[pid]) {
        _players[pid].score += score;
    }
}

module.exports = {
    updatePlayer: updatePlayer,
    createPlayer: createPlayer,
    getAllPlayers: getAllPlayers,
    isTargetAPlayer: isTargetAPlayer,
    hitPlayer: hitPlayer,
    removePlayer:removePlayer,
    addScore: addScore
}