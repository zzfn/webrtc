import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const pc = useRef<RTCPeerConnection>()
  const localStreamRef = useRef<MediaStream>()
  const wsRef = useRef(new WebSocket('wss://ws.zzfzzf.com'))
  const username = (Math.random() + 1).toString(36).substring(7)
  const [status, setStatus] = useState('开始通话')

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then(() => {
      initWs()
      getMediaDevices().then(() => {
        createRtcConnection()
        addLocalStreamToRtcConnection()
      })
    })
  }, [])

  const initWs = () => {
    wsRef.current.onopen = () => console.log('ws 已经打开')
    wsRef.current.onmessage = wsOnMessage
  }

  const wsOnMessage = (e:any) => {
    // e.data.text().then((msg: any) => {
    console.log(11111111, e, JSON.parse(e.data))
    const wsData = JSON.parse(e.data);
      console.log('wsData', wsData)

      const wsUsername = wsData['username']
      console.log('wsUsername', wsUsername)
      if (username === wsUsername) {
        console.log('跳过处理本条消息')
        return
      }

      const wsType = wsData['type']
      console.log('wsType', wsType)

      if (wsType === 'offer') {
        const wsOffer = wsData['data']
        pc.current?.setRemoteDescription(new RTCSessionDescription(JSON.parse(wsOffer)))
        setStatus('请接听通话')
      }
      if (wsType === 'answer') {
        const wsAnswer = wsData['data']
        pc.current?.setRemoteDescription(new RTCSessionDescription(JSON.parse(wsAnswer)))
        setStatus('通话中')
      }
      if (wsType === 'candidate') {
        const wsCandidate = JSON.parse(wsData['data'])
        pc.current?.addIceCandidate(new RTCIceCandidate(wsCandidate))
        console.log('添加候选成功', wsCandidate)
      }
    // })
  }

  const wsSend = (type: string, data: any) => {
    wsRef.current.send(JSON.stringify({
      username,
      type,
      data,
    }))
  }

  const getMediaDevices = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })
    console.log('stream', stream)
    localVideoRef.current!.srcObject = stream
    localStreamRef.current = stream
  }

  const createRtcConnection = () => {
    const _pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.relay.metered.ca:80",
        },
        {
          urls: "turn:a.relay.metered.ca:80",
          username: "930efe43228b1175f719e452",
          credential: "2nkrX+MuhVP2svcp",
        },
        {
          urls: "turn:a.relay.metered.ca:80?transport=tcp",
          username: "930efe43228b1175f719e452",
          credential: "2nkrX+MuhVP2svcp",
        },
        {
          urls: "turn:a.relay.metered.ca:443",
          username: "930efe43228b1175f719e452",
          credential: "2nkrX+MuhVP2svcp",
        },
        {
          urls: "turn:a.relay.metered.ca:443?transport=tcp",
          username: "930efe43228b1175f719e452",
          credential: "2nkrX+MuhVP2svcp",
        },
      ],
    })
    _pc.onicecandidate = e => {
      if (e.candidate) {
        console.log('candidate', JSON.stringify(e.candidate))
        wsSend('candidate', JSON.stringify(e.candidate))
      }
    }
    _pc.ontrack = e => {
      remoteVideoRef.current!.srcObject = e.streams[0]
    }
    pc.current = _pc
    console.log('rtc 连接创建成功', _pc)
  }

  const createOffer = () => {
    pc.current?.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true,
    })
      .then(sdp => {
        console.log('offer', JSON.stringify(sdp))
        pc.current?.setLocalDescription(sdp)
        wsSend('offer', JSON.stringify(sdp))
        setStatus('等待对方接听')
      })
  }

  const createAnswer = () => {
    pc.current?.createAnswer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true,
    })
      .then(sdp => {
        console.log('answer', JSON.stringify(sdp))
        pc.current?.setLocalDescription(sdp)
        wsSend('answer', JSON.stringify(sdp))
        setStatus('通话中')
      })
  }

  const addLocalStreamToRtcConnection = () => {
    const localStream = localStreamRef.current!
    localStream.getTracks().forEach(track => {
      pc.current!.addTrack(track, localStream)
    })
    console.log('将本地视频流添加到 RTC 连接成功')
  }

  return (
    <div>
      <div>{`username:${username}`}</div>
      <video style={{ width: '400px' }} ref={localVideoRef} autoPlay controls></video>
      <video style={{ width: '400px' }} ref={remoteVideoRef} autoPlay controls></video>
      <br />
      <p>{`当前状态：${status}`}</p>
      <br />
      {status === '开始通话' && (
        <button onClick={createOffer}>拨号</button>
      )}
      {status === '请接听通话' && (
        <button onClick={createAnswer}>接听</button>
      )}
    </div>
  )
}

export default App
