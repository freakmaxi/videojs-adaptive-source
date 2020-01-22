# Video.js Adaptive Source 

Adaptive source for [video.js v7](https://github.com/videojs/video.js)

## Example

You can visit [this link](http://imfrk.com/p/videojs-adaptive-source/example.html) to see the working example.

## Installation

copy the following two files into your project.

```
- videojs-adaptive-source.css
- videojs-adaptive-source.js
``` 

add in your html page

```html
<link href="video-js.css" rel="stylesheet">
<link href="videojs-adaptive-source.css" rel="stylesheet">
<script src="video.js"></script>
<script src="videojs-adaptive-source.js"></script>

<video id='video' class="video-js vjs-default-skin" playsinline></video>
<script type="text/javascript">
    videojs(
        'video',
        {
            controls: true,
            plugins: {
              videoJsAdaptiveSource: {
                useIconButton: false,
                disableAdaptive: false,
                threshold: 4
              }
            }
        },
        function()
        {
            this.setSources([
              {
                src: 'sample_426x240_1000k.mp4',
                type: 'video/mp4',
                label: '240p',
                bitrate: 1000
              },
              {
                src: 'sample_640x360_1500k.mp4',
                type: 'video/mp4',
                label: '360p',
                bitrate: 1500
              },
              {
                src: 'sample_854x480_2000k.mp4',
                type: 'video/mp4',
                label: '480p',
                bitrate: 2000
              },
              {
                src: 'sample_1280x720_3000k.mp4',
                type: 'video/mp4',
                label: '720p',
                bitrate: 3000
              },
              {
                src: 'sample_1920x1080_5000k.mp4',
                type: 'video/mp4',
                label: '1080p',
                bitrate: 5000
              }
            ], "test.jpg");
        });
</script>
```

### Key Points

To able to have the properly working adaptive source plugin, the followings are
**very very** important for the sake of your project.

- When you are setting up video source, NEVER EVER skip to set the correct `bitrate` value
for your video. the WHOLE CALCULATION depends on that value. 
- If you provide an image suitable to your max bitrate source, the speed test can be done
efficiently.

#### How should be suitable image?

`1 byte = 8 bits`

Let's jump in to some theoretical knowledge. `bitrate` is the number of bits that are conveyed
or processed per unit of time. It means that, your video provide sequence of images in bitrate
size. So `1000k` bitrate video provides `1000kbit / 8 = 125kb` data in a second. The size of the 
video is not important. You can create a video with 5000kbit on 640x360 as well as 1920x1080. So
what you should pay attention is the bitrate.

According to this calculation, when you are choosing the **test image** you should take the reference
of the highest bitrate video. Let's get my sources as example. The highest bitrate video is 
`sample_1920x1080_5000k.mp4`. The bitrate of the video is `5000k`. It means that `5000kbit / 8 = 625 kb`
data in a second will be downloaded for the smooth video play.

So your test image should be this size to able to calculate the internet speed. If test image can be
downloaded in a second, so viewer can play the sample 1080p video without any problem.

According to this, you HAVE TO calculate the proper image size for your source. 

**What if the test image is smaller** Player cannot calculate the internet speed of the client correctly
so adaptive source plugin will not work efficient.

**What if the test image is bigger** The calculation of the internet speed of the client will take
time, so video player may be loaded late.

**What if the test image is not provided** Adaptive source plugin will choose the middle quality of
the provided sources as default and try to adjust the quality when it starts playing the video. HOWEVER, 
if you provide the videos in high value bitrate and client does not have the internet to play the 
video even it is middle quality according to your sources, so until adaptive source plugin finds the proper
quality, client will have bad experience about video viewing.

**You should choose a image file format that can not be compressed in server side.** In my example, the image
format is JPG. It means, when you make the request to server, some "very smart" servers want to compress the
image (if it is compressible) and deliver the client to make the data size smaller. For example BMP. It is an
uncompressed image file format and when you want to make a request to server, it will delivered with compression
to the client. That will cause calculation problem.

**How can I find an image?** Just download a wallpaper, open with Photoshop, Export as JPG without touching
anything. When you have the export settings window, play with the quality of the image to find the correct
file size. File size is automatically calculated and shown in Photoshop.  

**IMPORTANT** This plugin is not supporting any videojs tech other than HTML5.

## Plugin options

You can pass options to plugin like this:

```javascript

    videojs(
        'video',
        {
            controls: true,
            plugins: {
              videoJsAdaptiveSource: {
                useIconButton: false,
                disableAdaptive: false,
                threshold: 4
              }
            }
        },
        function()
        {
            // Setup source in here
        }
    );
```

As you see, there is only 3 options.

### Available Options
* useIconButton - `{Boolean}` - default is `false` and shows `auto` button on the control bar of the player. Otherwise
it shows gear icon. You can change that icon using CSS Style file.
* disableAdaptive - `{Boolean}` - default is `false`. If you make it `true`, you will have only source choices for you
 player and it will not try to find the correct bitrate for the viewer.
* threshold - `{Integer}` - default is `4`. Threshold will be used to take the action for source switching. Internet
speed calculation is a bit tricky. You can not change the source immediately when you reach the fast internet. It can 
be false alarm because the internet devices you are using sometimes buffer the input data and release at once. So, looks
like data reach you faster than you expected. So to prevent to have the false alarm, there is a threshold value to 
convince the Adaptive source plugin. If plugin thinks that it has enough input to change source, it will change. 

## Methods

### setSources([sources], [testImageUrl])
```javascript
player.setSources([
      {
        src: 'sample_426x240_1000k.mp4',
        type: 'video/mp4',
        label: '240p',
        bitrate: 1000
      },
      {
        src: 'sample_640x360_1500k.mp4',
        type: 'video/mp4',
        label: '360p',
        bitrate: 1500
      },
      {
        src: 'sample_854x480_2000k.mp4',
        type: 'video/mp4',
        label: '480p',
        bitrate: 2000
      },
      {
        src: 'sample_1280x720_3000k.mp4',
        type: 'video/mp4',
        label: '720p',
        bitrate: 3000
      },
      {
        src: 'sample_1920x1080_5000k.mp4',
        type: 'video/mp4',
        label: '1080p',
        bitrate: 5000
      }
    ], "test.jpg");
```
#### Parameters:
| name | type | required | description |
|:----:|:----:|:--------:|:-----------:|
| sources | array | yes | array of sources |
| testImageUrl | string | no | test image url |

## Sample Videos Pack
You can download the mentioned videos and test image using [this link](http://imfrk.com/p/videojs-adaptive-source/sample-videos-pack.zip)