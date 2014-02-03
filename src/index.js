var Stream = require('stream');
var util = require('util');

// Inherit of Readable stream
util.inherits(StreamQueue, Stream.PassThrough);

// Constructor
function StreamQueue(options) {

  options = options || {};

  // Ensure new were used
  if (!(this instanceof StreamQueue)) {
    return new (StreamQueue.bind.apply(StreamQueue,
      [StreamQueue].concat([].slice.call(arguments,0))));
  }

  // Pause option
  this._pause = false;
  if(options && (!(options instanceof Stream))
    && 'boolean' == typeof options.pause) {
    this._pause = options.pause;
    delete options.pause;
  }

  // Parent constructor
  Stream.PassThrough.call(this, options instanceof Stream ? undefined : options);

  // Prepare streams queue
  this._streams = [];
  this._running = false;
  this._ending = false;
  this._objectMode = options.objectMode || false;

  // Queue given streams and ends
  if(arguments.length > 1 || options instanceof Stream) {
    this.done.apply(this,
      [].slice.call(arguments, options instanceof Stream ? 0 : 1));
  }

}

// Queue each stream given in argument
StreamQueue.prototype.queue = function() {
  var streams = [].slice.call(arguments, 0)
    , _self = this;

  streams = streams.map(function(stream) {
    stream.on('error', function(err) {
      _self.emit('error', err);
    });
    if(_self._pause) {
      stream.pause();
      stream = stream.pipe(new Stream.PassThrough({objectMode: _self._objectMode}))
    }
    return stream;
  });

  if(this._ending) {
    throw new Error('Cannot add more streams to the queue.');
  }

  this._streams = this._streams.length ? this._streams.concat(streams) : streams;

  if(!this._running) {
    this._running = true;
    this._pipeNextStream();
  }

  return this;

};

// Pipe the next available stream
StreamQueue.prototype._pipeNextStream = function() {
  if(!this._streams.length) {
    if(this._ending) {
      this.emit('end');
    } else {
      this._running = false;
    }
    return;
  }
  var stream = this._streams.shift();
  stream.once('end', this._pipeNextStream.bind(this));
  stream.pipe(this, {end: false});
};

// Queue each stream given in argument
StreamQueue.prototype.done = function() {
  if(this._ending) {
    throw new Error('The queue is already ending.');
  }
  if(arguments.length) {
    this.queue.apply(this, arguments);
  }
  this._ending = true;
  if(!this._running) {
    this.emit('end');
  }
  return this;
}

// Length
Object.defineProperty(StreamQueue.prototype, 'length', {
  get: function() {
    return this._streams.length;
  }
});

module.exports = StreamQueue;
