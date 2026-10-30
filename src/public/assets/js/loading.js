var timer = 10;
     setInterval(function(){
      if(timer>=0){
      timer=timer-1;
      document.getElementById("timer").innerHTML = timer;
      }
      if(timer==0){
       location.reload();
       document.getElementById("starting").innerHTML = "Website is <strong>Starting!</strong>";
      }
     }, 1000);
