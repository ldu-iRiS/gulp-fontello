/**
 * Created by gillbeits on 01/04/15.
 */

var
  HOST        = 'http://fontello.com',

  needle      = require('needle'),
  through2    = require('through2'),
  AdmZip      = require('adm-zip'),
  path        = require('path'),
  $           = require('gulp-util'),
  yargs       = require('yargs'),
  extend      = require('util')._extend,

  PluginError = $.PluginError
  ;

const PLUGIN_NAME = 'gulp-fontello';

function fontello (opts) {
  "use strict";

  opts = extend({
    assetsOnly: true,
    host: HOST
  }, extend(opts || {}, yargs.argv));

  return through2.obj(function (file, enc, callback) {
    var self = this;

    var stream = through2.obj(function (file) {
      if (!file.toString()) {
        throw new PluginError(PLUGIN_NAME, "No session at Fontello for zip archive");
      }

      var url = opts.host + "/" + file.toString() + "/get";
      console.log('Get on URL : ' + url)

      /* 1st Sol : add a parameter in your config. Cons: can't work if the same code is used in multiple environment.
      if (opts.proxy) {
        reqOpts.proxy = opts.proxy;*/
      /* 2nd Sol : Use system env_var : Cons: if you need a different proxy on your machine and for local applications
      if (process.env.HTTP_PROXY) {
        reqOpts.proxy = process.env.HTTP_PROXY; */
      /* 3rd sol : Use npm config.proxy
        FAIL : de ce que j'ai compris, c'est ce qui devrait marcher automatiquement, si needle utilise les modules http ou request
      */
      /* Other? Test global-tunnel at a higher level? https://stackoverflow.com/questions/18586902/node-js-global-proxy-setting
        Mais il faut toujorus utiliser une variable quelque part
      */
      var reqOpts = { };
      if (process.env.HTTP_PROXY) {
        reqOpts.proxy = process.env.HTTP_PROXY;
        console.log('With proxy ' + reqOpts.proxy)
      }

      needle.get(url, reqOpts, function(error, response) {
        if (error) {
          throw 'Error on get : ' + error.code + ' : ' + error;
        }

        var
          zip = new AdmZip(response.body),
          zipEntries = zip.getEntries()
          ;

        zipEntries.forEach(function(zipEntry) {
          var dirName, fileName, pathName, _ref;

          if (zipEntry.isDirectory) return;

          pathName = zipEntry.entryName;
          dirName = (_ref = path.dirname(pathName).match(/\/([^\/]*)$/)) != null ? _ref[1] : void 0;
          fileName = path.basename(pathName);

          if (opts.assetsOnly && !dirName) return;

          var content = zipEntry.getData();
          if (opts['font'] && opts['font'] != 'font' && path.extname(fileName) == '.css') {
            content = new Buffer(String(content).replace(new RegExp('\.\.\/font\/', 'g'), '../' + opts['font'] + '/'));
          }

          var file = new $.File({
            cwd : "./",
            path : (dirName ? ((opts[dirName] ? opts[dirName] : dirName) + '/') : '')+ fileName,
            contents: content
          });
          self.push(file);
        });

        callback();
      });
    });

    console.log('Post on URL : ' + opts.host)
    var reqOpts = { multipart: true };
    if (process.env.HTTP_PROXY) {
      reqOpts.proxy = process.env.HTTP_PROXY;
      console.log('With proxy ' + reqOpts.proxy)
    }

    needle.post(
      opts.host, 
      {
        config: {
          buffer: file.contents,
          filename: 'fontello.json',
          content_type: 'application/json'
        }
      }, reqOpts, function(error, response) {
        if (response) {
          console.log('callback ');
        }
        if (error) {
          throw 'Error on post ' + error.code + ' : ' + error;
        }
      }
    
    ).pipe(stream);
  });
}

module.exports = fontello;
