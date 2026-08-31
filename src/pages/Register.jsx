import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';

export function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoMessage, setPhotoMessage] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const navigate = useNavigate();
  const { register } = useAuth();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to the terms and conditions');
      return;
    }

    setIsLoading(true);

    try {
      const res = await register(email, password, fullName, photo);
      if (res && res.error) {
        setError(res.error);
        setIsLoading(false);
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Email may already be registered.');
    } finally {
      setIsLoading(false);
    }
  };


  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result);
      setPhotoMessage('Photo will be used for your exam profile.');
    };
    reader.readAsDataURL(file);
  };

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setMediaStream(stream);
      setCameraActive(true);
      setPhotoMessage('Align your face within the frame and capture a clear image.');
    } catch (error) {
      setPhotoMessage('Unable to access camera. Please use photo upload instead.');
    }
  }, []);

  const closeCamera = useCallback(() => {
    mediaStream?.getTracks().forEach((track) => track.stop());
    setMediaStream(null);
    setCameraActive(false);
  }, [mediaStream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhoto(dataUrl);
      setPhotoMessage('Photo captured successfully.');
      closeCamera();
    }
  }, [closeCamera]);

  useEffect(() => {
    if (cameraActive && mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [cameraActive, mediaStream]);

  useEffect(() => {
    return () => {
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, [mediaStream]);

  return (
    <AuthLayout>
      <div className="w-full max-w-5xl py-3 md:py-4">
        <div className="grid overflow-hidden rounded-[2rem] border border-white/60 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur md:grid-cols-[0.85fr_1.15fr]">
          <aside className="relative hidden overflow-hidden bg-[#10243d] p-8 text-white md:flex md:flex-col md:justify-between lg:p-10">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[36px] border-cyan-300/10" />
            <div className="relative">
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300 text-[#10243d] shadow-lg shadow-cyan-300/20">
                <span className="material-symbols-outlined text-2xl">security</span>
              </div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">ExamGuard / Secure access</p>
              <h1 className="max-w-sm text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">Confidence before every question.</h1>
              <p className="mt-6 max-w-sm text-base leading-7 text-slate-300">A trusted examination workspace built for focused candidates and vigilant teams.</p>
            </div>
            <div className="relative flex items-center gap-3 text-sm text-slate-300">
              <span className="material-symbols-outlined text-cyan-300">verified_user</span>
              Identity-aware. Session-secure. Exam-ready.
            </div>
          </aside>

          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md md:rounded-none md:border-0">
          <div className="h-2 bg-secondary"></div>
          <div className="p-8 md:p-10">
            <div className="mb-stack-lg text-center">
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Create Account</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Join ExamGuard and start your secure exams today.</p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-error/10 text-error border border-error rounded-lg font-body-md text-body-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-stack-md">
              {/* Full Name */}
              <div className="space-y-stack-sm">
                <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="fullName">
                  Full Name
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    person
                  </span>
                  <input
                    type="text"
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="auth-input w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-stack-sm">
                <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="email">
                  Email Address
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    mail
                  </span>
                  <input
                    type="email"
                    id="email"
                    placeholder="name@institution.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="auth-input w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-stack-sm">
                <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="password">
                  Password
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="auth-input w-full pl-10 pr-12 py-3 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-stack-sm">
                <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="auth-input w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Photo Capture */}
              <div className="space-y-stack-sm">
                <label className="block font-label-md text-label-md text-on-surface-variant">Candidate Photo</label>
                <div className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-primary-container text-on-primary-container font-bold hover:bg-primary transition-all"
                      >
                        <span className="material-symbols-outlined">upload</span>
                        Upload Photo
                      </button>
                      <button
                        type="button"
                        onClick={openCamera}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary text-on-secondary hover:bg-secondary/90 transition-all"
                      >
                        <span className="material-symbols-outlined">camera_alt</span>
                        Use Webcam
                      </button>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handlePhotoChange}
                      className="hidden"
                    />

                    {cameraActive && (
                      <div className="rounded-3xl overflow-hidden border border-outline-variant">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-auto bg-black" />
                        <div className="flex gap-3 p-4 bg-surface-container-low">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-container text-on-primary-container font-bold hover:bg-primary transition-all"
                          >
                            <span className="material-symbols-outlined">photo_camera</span>
                            Capture
                          </button>
                          <button
                            type="button"
                            onClick={closeCamera}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-all"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}

                    {photo && (
                      <div className="w-24 h-24 rounded-3xl overflow-hidden border border-outline-variant">
                        <img src={photo} alt="Captured candidate" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Upload or capture a photo to complete registration and help verify your identity during the exam.
                  </p>
                  {photoMessage && (
                    <p className="font-label-sm text-label-sm text-secondary">{photoMessage}</p>
                  )}
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="flex items-start py-2">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary cursor-pointer mt-1"
                />
                <label className="ml-2 font-body-md text-label-md text-on-surface-variant cursor-pointer select-none" htmlFor="agreeTerms">
                  I agree to the{' '}
                  <a href="/#terms" className="text-primary font-bold hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/#privacy" className="text-primary font-bold hover:underline">
                    Privacy Policy
                  </a>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                <span>{isLoading ? 'Creating Account...' : 'Register'}</span>
                {!isLoading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-stack-lg pt-stack-lg border-t border-outline-variant/30 text-center">
              <p className="font-body-md text-body-md text-on-surface-variant">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-bold hover:underline transition-colors">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
        </div>

        {/* Footer Links */}
        <div className="mt-stack-lg flex justify-center gap-gutter">
          <a className="font-label-sm text-label-sm text-outline hover:text-on-surface-variant transition-colors" href="/#privacy">
            Privacy Policy
          </a>
          <a className="font-label-sm text-label-sm text-outline hover:text-on-surface-variant transition-colors" href="/#terms">
            Terms of Use
          </a>
        </div>
      </div>
    </AuthLayout>
  );
}

export default Register
