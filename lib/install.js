'use strict';

const { spawn } = require('then-utils');
const streams = require('./logStreams');
const { Readable: ReadableStream } = require('stream');

module.exports = (pkg) => {
  const prom = spawn('brew', ['install', '-v', pkg]);
  const child = prom.cmd;
  const myRef = streams.install = new ReadableStream();
  myRef._read = () => null;
  const dataHandler = chunk => myRef.push(chunk);
  let endI = 0;
  const endHandler = () => {
    endI++;
    if (endI === 2) {
      // both streams are done
      myRef.push(null);
    }
  };
  child.stdout.on('data', dataHandler);
  child.stderr.on('data', dataHandler);
  child.stdout.once('end', endHandler);
  child.stderr.once('end', endHandler);
  myRef.once('end', () => {
    // make sure that we don't remove a different stream
    if (streams.install === myRef) {
      streams.install = null;
    }
  });
  return prom;
};
