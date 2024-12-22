import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-interview',
  imports: [FormsModule, CommonModule],
  templateUrl: './interview.component.html',
  styleUrl: './interview.component.scss'
})
export class InterviewComponent {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;

  questions: string[] = [
    'Introduce yourself.',
    'What are your strengths?',
    'Where do you see yourself in 5 years?',
  ];
  currentQuestionIndex: number = 0;
  timestamps: { questionStart: number; answerEnd: number; questionText: string, answer: string }[] = [];
  currentAnswer: string = '';
  videoBlob: Blob | null = null;
  voiceSpeed: number = 1;
  mediaRecorder: MediaRecorder | null = null;
  stream: MediaStream | null = null;
  interviewStartTime: number | null = null;
  elapsedTime: string = '00:00';
  timerInterval: any;
  questionAnswerLogs: any[] = [];
  isRecording: boolean = false;
  recognition: any;
  isSpeaking: boolean = false; // Flag to track if the bot is speaking
  botSpeechText: string = ''; // Text that the bot is speaking


  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.interimResults = false;
    this.recognition.continuous = true;
    this.recognition.onresult = (event: any) => {
      const transcript: string = event.results[event.resultIndex][0].transcript;
      console.log("transcript>>>",transcript);
      this.currentAnswer += transcript;
      console.log("currentAnswer>>>",this.currentAnswer);
    };

    // Create an AudioContext to manage the microphone stream
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true }, video: false })
      .then((stream) => {
        // Mute the audio track(s) to avoid hearing feedback
        const audioTracks = stream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = false;  // Disable the audio track to stop hearing the microphone input
        });
        console.log("audioTracks>>>", audioTracks);

        // Optionally, connect the media stream to an AudioContext if needed
        const mediaStreamNode = audioContext.createMediaStreamSource(stream);
        // No need to connect this to audioContext.destination, to avoid feedback loop
        // mediaStreamNode.connect(audioContext.destination);
      })
      .catch((err) => {
        console.error("Error accessing microphone:", err);
      });

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };
  }

  startInterview(): void {
    this.interviewStartTime = performance.now();
    this.startTimer();
    this.startRecording();
    this.askQuestion();
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.interviewStartTime) {
        const now = performance.now();
        const elapsedMs = now - this.interviewStartTime;
        const minutes = Math.floor(elapsedMs / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);
        this.elapsedTime = `${this.padZero(minutes)}:${this.padZero(seconds)}`;
      }
    }, 1000);
  }

  stopTimer(): void {
    clearInterval(this.timerInterval);
  }

  padZero(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  askQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length) {
      const question = this.questions[this.currentQuestionIndex];
      const answer =  this.questionAnswerLogs[this.currentQuestionIndex]?.answer ?? ''
      const questionStart = performance.now();
      this.timestamps.push({ questionStart, answerEnd: 0, questionText: question, answer });
      this.speakQuestion(question);
      this.currentAnswer = '';
      this.questionAnswerLogs.push({ question, answer: 'No Audio' });
    }
  }

  nextQuestion(): void {
    const answerEnd = performance.now();
    const currentIndex = this.timestamps.length - 1;
    this.timestamps[currentIndex].answerEnd = answerEnd;

    // Save the answer to the log
    console.log(">>>>", this.currentQuestionIndex);
    console.log('this.currentAnswer>>>', this.currentAnswer);
    if (this.questionAnswerLogs[this.currentQuestionIndex]) {
      this.questionAnswerLogs[this.currentQuestionIndex].answer = this.currentAnswer ?? 'No Audio';
    }

    this.currentQuestionIndex++;
    if (this.currentQuestionIndex < this.questions.length) {
      this.askQuestion();
    } else {
      this.stopRecording();
      this.stopTimer();
    }
  }

  speakQuestion(text: string): void {
    this.botSpeechText = text;  // Set the text the bot is speaking
    this.isSpeaking = true;  // Set the flag to true when the bot starts speaking
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'en-US';
    speech.rate = this.voiceSpeed;
    window.speechSynthesis.speak(speech);
  }

  startRecording(): void {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      this.stream = stream;
      this.mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      this.mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        this.videoBlob = new Blob(chunks, { type: 'video/webm' });
      };

      this.mediaRecorder.start();

      // Bind the video stream to the video element, but don't play back the microphone audio
      if (this.videoElement && this.videoElement.nativeElement) {
        const video: HTMLVideoElement = this.videoElement.nativeElement;
        video.srcObject = stream;
        video.muted = true;  // Mute the video element to avoid feedback (you don’t want to hear the video stream)
      }
    }).catch((err) => {
      alert('Camera and microphone access are required.');
      console.error(err);
    });
  }

  stopRecording(): void {
    this.mediaRecorder?.stop();
    this.stream?.getTracks().forEach((track) => track.stop());
  }

  startAnswerRecording(): void {
    this.isRecording = true;
    this.recognition.start();
  }

  stopAnswerRecording(): void {
    this.isRecording = false;
    this.recognition.stop();
  }

  uploadVideo(): void {
    if (this.videoBlob) {
      const formData = new FormData();
      formData.append('file', this.videoBlob, 'interview.webm');
      formData.append('timestamps', JSON.stringify(this.timestamps));
      console.log(">>>>>>>", this.videoBlob);
      console.log('>>>>>', this.timestamps);
    }
  }
}
