/*! videojs-adaptive-source - 2020-01-21
 * Copyright (c) 2020 Tuna Celik
 * Licensed under the GNUv3 license. */

(function() {
  'use strict';
  let videojs = null;
  if (typeof window.videojs === "undefined" && typeof require === "function")
    videojs = require("video.js");
  else
    videojs = window.videojs;

  (function(window, videojs) {
    let videoJsAdaptiveSource;
    let defaults = {
      ui: true
    };

    videoJsAdaptiveSource = function(options) 
    {
      let settings = videojs.mergeOptions(defaults, options),
          player = this,
          sources = [],
          currentSource = {},
          speedTestImageUrl = "",
          speedTestImageSize = -1,
          speedTestTimeout = null,
          screenshotCanvas = null,
          sourceSourceMemory = {},
          guessInterval = null;

      player.setSources = function(sourceList, speedTestImageUrl)
      {
        if (!settings.threshold)
          settings.threshold = 4;

        if (speedTestImageUrl)
          this.speedTestImageUrl = speedTestImageUrl;
        else 
          this.speedTestImageUrl = "";

        this.speedTestImageSize = -1;
        this.sourceSourceMemory = {};

        this.screenshotCanvas = document.createElement("canvas");
        this.screenshotCanvas.setAttribute("style", "display: none");
        this.el().appendChild(this.screenshotCanvas);

        if (!sourceList) return player.src();

        sourceList = sourceList.filter(function(source) 
        {
          try 
          {
            return (player.canPlayType(source.type) !== "");
          } 
          catch (e) 
          {
            return true;
          }
        });

        this.sources = sourceList.sort(function(a, b)
        {
          if (!a.bitrate || !b.bitrate) return 0;
          return (+b.bitrate) - (+a.bitrate);
        });
        
        this.prepareSources(this.sources);
        this.chooseSource(this.sources);

        let self = this;
        this.on("pause", function() 
        { 
          this.stopSpeedGuess();
          if (self.speedTestTimeout)
            clearTimeout(self.speedTestTimeout);

          self.one("play", function() 
          { 
            self.clicked(self.currentSource.label);
          });
        });
        this.on("ended", function() 
        {
          this.stopSpeedGuess();
          if (self.speedTestTimeout)
            clearTimeout(self.speedTestTimeout);
          
          self.one("play", function() 
          { 
            self.clicked(self.currentSource.label);
          });
        });

        return player;
      };

      player.prepareSources = function(sources)
      {
        for (let i = 0; i < sources.length; i++)
        {
          let source = sources[i];

          if (source.auto) continue;
          
          source.auto = false;
          source.baseLabel = source.label;
        }

        if (sources.length === 0) return;
        if (settings.disableAdaptive) return;

        sources.push({
            label: "auto",
            baseLabel: "",
            auto: true,
            src: "",
            bitrate: 0
          });
      };

      player.chooseSource = function(sources)
      {
        if (sources.length === 0) return;

        let self = this;
        let setMiddleQuality = function (autoSource) {
          let m =
              Math.floor((sources.length - 1) / 2);
          source = sources[m];

          if (autoSource)
          {
            autoSource.baseLabel = source.label;
            autoSource.src = source.src;
            autoSource.bitrate = source.bitrate;
          }

          self.currentSource = source;
          self.reloadSource();
        };

        let source = sources[sources.length - 1];

        // Test internet speed to guess the bandwidth
        if (source.auto)
        {
          if (this.speedTest(true))
          {
            let lowestSource =
                sources[sources.length - 2];
            source.baseLabel = lowestSource.label;
            source.src = lowestSource.src;
            source.bitrate = lowestSource.bitrate;

            this.currentSource = source;
          }
          else
            setMiddleQuality(source);
        }
        else
          setMiddleQuality();

        this.one("play", function() 
        { 
          self.clicked(self.currentSource.label);
        });
      };

      player.speedTest = function() 
      {
        if (this.speedTestImageUrl === "") return false;

        let self = this;

        if (this.speedTestImageSize === -1) 
        {
          let xHttp = new XMLHttpRequest;

          xHttp.onreadystatechange = function()
          {
            if (xHttp.readyState !== 4) return;
            self.speedTestImageSize = xHttp.getResponseHeader("Content-Length");
          };
      
          xHttp.open("head", this.speedTestImageUrl, true);
          xHttp.send();
        }

        let startTime, endTime;
        let i = new Image();
        i.onload = function () 
        {
          endTime = (new Date()).getTime();
  
          let duration = (endTime - startTime) / 1000;
          let bitsLoaded = self.speedTestImageSize * 8;
          let speedKBps = (bitsLoaded / duration / 1024).toFixed(2);

          self.adaptiveSourceSwitch(true, speedKBps);
        };
  
        startTime = (new Date()).getTime();
        i.src = this.speedTestImageUrl + "?r=" + startTime;

        return true;
      };

      player.adaptiveSourceSwitch = function (initial, speedKBps) 
      {
        let self = this;
        let examSource = function (source)
        {
          if (initial) return true;

          let hit = self.sourceSourceMemory[source.bitrate];
          if (!hit)
          {
            self.sourceSourceMemory = {};
            self.sourceSourceMemory[source.bitrate] = 1;
            return false;
          }
          else
            self.sourceSourceMemory[source.bitrate]++;

          if (self.sourceSourceMemory[source.bitrate] < settings.threshold) return false;

          self.sourceSourceMemory = {};

          return true;
        };

        let executeSource = function (source)
        {
          self.currentSource.baseLabel = source.label;
          self.currentSource.src = source.src;
          self.currentSource.bitrate = source.bitrate;
          self.reloadSource();

          self.trigger("adaptiveSource", self.currentSource.baseLabel);
        };

        for (let i = 0; i < this.sources.length; i++)
        {
          let source = this.sources[i];

          if (source.auto) continue;
          if (speedKBps < source.bitrate) continue;
          if (this.currentSource.bitrate === source.bitrate) return;
          if (!examSource(source)) return;

          executeSource(source);
          return;
        }

        let source = 
          this.sources[this.sources.length - 2];
        if (this.currentSource.bitrate === source.bitrate) return;
        if (!examSource(source)) return;

        executeSource(source);
      };

      player.setTransitionPoster = function() 
      {
        if (!this.screenshotCanvas) return;

        this.screenshotCanvas.width = this.videoWidth();
        this.screenshotCanvas.height = this.videoHeight();

        let screenshotContext = this.screenshotCanvas.getContext("2d");
        screenshotContext.fillRect(0, 0, this.videoWidth(), this.videoHeight());
        screenshotContext.drawImage(this.children_[0], 0, 0, this.videoWidth(), this.videoHeight());
        this.poster(this.screenshotCanvas.toDataURL());
      };

      player.startSpeedGuess = function() 
      {
        //if (this.guessInterval) return;

        let self = this;
        let compare = function(h) 
        {
          if (h.length < 2) return 0;

          let l = h[h.length - 2];
          let r = h[h.length - 1];

          h.splice(0, h.length - 1);

          return (r-l);
        };

        let history = [];
        this.guessInterval = setInterval(function() 
        {
          history.push(self.bufferedEnd());
          
          let com = compare(history);
          if (com === 0) return;

          let bufferLength = self.bufferedEnd() - self.currentTime();
          if (com < 1 && bufferLength > 5) return;
          if (com < 0) return;

          self.adaptiveSourceSwitch(false, self.currentSource.bitrate * com)
        }, 1000);
      };

      player.stopSpeedGuess = function() 
      {
        if (this.guessInterval)
          clearInterval(this.guessInterval);
      };

      player.reloadSource = function() 
      {
        this.stopSpeedGuess();

        let self = this;
        let currentTime = this.currentTime();
        let isPaused = this.paused();

        if (!isPaused) 
        {
          this.bigPlayButton.hide();
          this.setTransitionPoster();
        }
        this.src({type: this.currentSource.type, src: this.currentSource.src});
        this.one("loadeddata", function()
        {
          self.currentTime(currentTime);
          if (!isPaused)
          {
            self.one("play", function() { self.startSpeedGuess(); });
            self.play();
          }
        });
      };

      player.clicked = function(label) 
      {
        for (let i = 0; i < this.sources.length; i++)
        {
          let source = this.sources[i];
          if (source.label !== label) continue;

          this.stopSpeedGuess();
          if (this.speedTestTimeout)
            clearTimeout(this.speedTestTimeout);

          this.currentSource = source;
          if (source.auto)
            this.startSpeedGuess();
          
          this.reloadSource();
          this.trigger("sourceChanged", this.currentSource.label);
          this.trigger("adaptiveSource", this.currentSource.baseLabel);

          return;
        }
      };

      player.ready(function()
      {
        let menuButton =
          new AdaptiveSourceMenuButton(this, settings);
        this.controlBar.adaptiveSource = 
          this.controlBar.el_.insertBefore(menuButton.el_, this.controlBar.getChild("fullscreenToggle").el_);
        this.controlBar.adaptiveSource.dispose = function()
        {
          this.parentNode.removeChild(this);
        };
      });
    };
    videojs.registerPlugin("videoJsAdaptiveSource", videoJsAdaptiveSource);

    /* Menu Button */
    let MenuButton = videojs.getComponent("MenuButton");
    let AdaptiveSourceMenuButton = videojs.extend(MenuButton, 
    {
      constructor: function(player, options)
      {      
        this.label = document.createElement("span");
        options.label = "Quality";

        MenuButton.call(this, player, options);
       
        this.el().setAttribute("aria-label", "Quality");
        this.controlText("Quality");
        
        if (options.useIconButton)
        {
          let staticLabel = document.createElement("span");
          staticLabel.setAttribute("class", "vjs-menu-icon");
          this.el().children[0].appendChild(staticLabel);
        }
        else
        {
          this.label.setAttribute("class", "vjs-adaptive-source-button-label");
          this.el().children[0].appendChild(this.label);
        }
        
        let self = this;
        player.on("sourceChanged", function(e, label) { self.update(label); });
      }
    });
    AdaptiveSourceMenuButton.prototype.buildCSSClass = function()
    {
      return MenuButton.prototype.buildCSSClass.call(this) + " vjs-adaptive-source-button";
    };
    AdaptiveSourceMenuButton.prototype.update = function(label)
    {
      this.sources = this.player_.sources;
      this.label.innerHTML = label ? label : this.player_.currentSource.label;

      return MenuButton.prototype.update.call(this, label);
    };
    AdaptiveSourceMenuButton.prototype.createItems = function()
    {
      let menuItems = [];

      for (let i = 0; i < this.sources.length; i++)
      {
        let source = this.sources[i];

        menuItems.push(
          new AdaptiveSourceMenuItem(
            this.player_,
            {
              label: source.label,
              selected: source.label === (this.player_.currentSource ? this.player_.currentSource.label : false)
            }
          ));
      }

      return menuItems;
    };
    MenuButton.registerComponent("AdaptiveSourceMenuButton", AdaptiveSourceMenuButton);


    /* Menu Item Buttons */
    let MenuItem = videojs.getComponent("MenuItem");
    let AdaptiveSourceMenuItem = videojs.extend(MenuItem, 
    {
      constructor: function(player, options)
      {
        options.selectable = true;
        
        MenuItem.call(this, player, options);

        let self = this;
        let selfEl = this.el_;
        player.on("sourceChanged", function(e, label) { self.update(selfEl, label); });
        player.on("adaptiveSource", function(e, label) { self.adaptiveSourceUpdate(selfEl, label); });
      }
    });
    AdaptiveSourceMenuItem.prototype.buildCSSClass = function()
    {
      return MenuItem.prototype.buildCSSClass.call(this) + " vjs-adaptive-source-menu-item";
    };
    AdaptiveSourceMenuItem.prototype.update = function(el, label)
    {
      this.isSelected_ = this.options_.label === label;
      this.adaptiveSourceUpdate(el, label);
    };
    AdaptiveSourceMenuItem.prototype.adaptiveSourceUpdate = function(el, label)
    {
      if (this.options_.label === label)
        videojs.dom.addClass(el, "selected");
      else
        videojs.dom.removeClass(el, "selected");
    };
    AdaptiveSourceMenuItem.prototype.handleClick = function(event)
    { 
      this.player_.clicked(this.options_.label);
    };
    MenuItem.registerComponent("AdaptiveSourceMenuItem", AdaptiveSourceMenuItem);

  })(window, videojs);
})();
