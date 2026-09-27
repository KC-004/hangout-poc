import assert from 'node:assert/strict';
import {Client} from '@colyseus/sdk';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const a=await new Client('ws://127.0.0.1:2567').joinOrCreate('arena',{name:'Action check'});
const b=await new Client('ws://127.0.0.1:2567').joinById(a.roomId,{name:'Observer'});
try{await sleep(200);a.send('jump');await sleep(200);assert.ok(b.state.players.get(a.sessionId).y>0);await sleep(700);assert.equal(b.state.players.get(a.sessionId).y,0);a.send('emote','wave');await sleep(150);assert.equal(b.state.players.get(a.sessionId).emote,'wave');a.send('emote','invalid');await sleep(100);assert.equal(b.state.players.get(a.sessionId).emote,'wave');await sleep(500);a.send('emote','dance');await sleep(150);assert.equal(b.state.players.get(a.sessionId).emote,'dance');a.send('input',{x:1,z:0});await sleep(150);assert.equal(b.state.players.get(a.sessionId).emote,'');console.log('PASS synchronized jump, landing, wave, dance, invalid action rejection, movement cancels emote');}finally{await a.leave();await b.leave();}
