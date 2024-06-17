import React, { useState, useRef, useEffect } from 'react';
import Peer from "simple-peer";
import io from "socket.io-client";
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import PhoneIcon from '@mui/icons-material/Phone';
import { makeStyles } from '@material-ui/core/styles';

const socket = io.connect("https://192.168.29.106:5000",{secure:true});
const useStyles = makeStyles((theme) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#282c34', // Set your desired background color
    color: '#fff', // Set text color
  },
  videoContainer: {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#808080',
    borderRadius: '20px',
    margin: '20px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  video: {
    display: "flex",
    justifyContent: 'center',
    borderRadius: '20px',
    margin: '20px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
    transition: 'transform 0.3s ease-in-out',
    '&:hover': {
      transform: 'scale(1.05)',
    },
    overflow: 'hidden',
  },
  callButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '20px',
  },
}));

function App() {
  const classes = useStyles();
  const myVideo = useRef();
  const userVideo = useRef();
  const [me, setMe] = useState("");
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const connectionRef = useRef();
  const [connectedClients, setConnectedClients] = useState([]);
  const callButtonRef = useRef(null);

  useEffect(() => {
    const getMedia = async () => {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        myVideo.current.srcObject = userStream;
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    socket.on("me", (id) => {
      setMe(id)
    });

    socket.on("updateClients", (clients) => {
      setConnectedClients(clients);
    });

    getMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });

    peer.on("stream", (remoteStream) => {
      userVideo.current.srcObject = remoteStream;
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("stream", (remoteStream) => {
      userVideo.current.srcObject = remoteStream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  const callFirstClient = () => {
    if (connectedClients.length > 1) {
      const firstClient = connectedClients[0];
      console.log('hello');
      callUser(firstClient);
    }
  };

  return (
    <div className={classes.container}>
      <div className={classes.videoContainer}>
        <div className={classes.video}>
          {stream && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
        </div>
        <div className={classes.video}>
          {callAccepted && !callEnded ? (
            <video playsInline ref={userVideo} autoPlay style={{ width: "300px" }} />
          ) : null}
        </div>
      </div>
      <div className={classes.callButton}>
        {callAccepted && !callEnded ? (
          <Button variant="contained" color="secondary" onClick={leaveCall}>
            End Call
          </Button>
        ) : (
          <IconButton color="primary" aria-label="call" onClick={callFirstClient} ref={callButtonRef}>
            <PhoneIcon fontSize="large" />
          </IconButton>
        )}
      </div>
      <div>
        {receivingCall && !callAccepted ? (
          <div className="caller">
            <h1>Client is calling...</h1>
            <Button variant="contained" color="primary" onClick={answerCall}>
              Answer
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;
