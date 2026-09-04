document.addEventListener('DOMContentLoaded', function() {
  
  // --- NATIVE HTML5 VIDEO LOGIC ---
  const nativeVideo = document.getElementById('tpl-native-video');
  const customBtn = document.getElementById('tpl-custom-play-btn');
  
  if (nativeVideo && customBtn) {
    customBtn.addEventListener('click', function() {
      // Start playing with sound
      nativeVideo.muted = false;
      nativeVideo.play().then(() => {
        // Hide our custom button once playing
        customBtn.style.display = 'none';
      }).catch(err => {
        console.warn('Native video play prevented', err);
      });
    });

    // If user pauses the video, we can optionally show the button again,
    // but the native controls are enough. We'll just let native controls handle it.
  }

  // --- YOUTUBE FALLBACK LOGIC (For other videos if any) ---
  function initPlayers() {
    const wrappers = document.querySelectorAll('.tpl-video-player-wrap');
    wrappers.forEach(function(wrap) {
      const videoWrapper = wrap.querySelector('.video-wrapper[data-youtube]');
      if (!videoWrapper) return;
      
      const hint = wrap.querySelector('.tpl-video-play-hint');
      const url = videoWrapper.getAttribute('data-youtube');
      const match = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      const videoId = match ? match[1] : null;
      if (!videoId) return;

      const player = new YT.Player(videoWrapper, {
        videoId: videoId,
        playerVars: {
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          controls: 1,
          mute: 0, 
          enablejsapi: 1,
          playsinline: 1,
          autoplay: 0
        },
        events: {
          onReady: function(event) {
            const playHandler = function() {
              event.target.playVideo();
              if (hint) hint.style.display = 'none';
            };
            
            if (hint) {
              hint.addEventListener('click', playHandler);
            }
          },
          onStateChange: function(event) {
            if (event.data === YT.PlayerState.PLAYING && hint) {
              hint.style.display = 'none';
            }
          }
        }
      });
    });
  }

  if (document.querySelector('.video-wrapper[data-youtube]')) {
    if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode.insertBefore(tag, firstScript);
      window.onYouTubeIframeAPIReady = initPlayers;
    } else {
      initPlayers();
    }
  }
});
