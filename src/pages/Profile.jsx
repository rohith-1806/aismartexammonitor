import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppLayout } from '../layouts/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';
import { useAppData } from '../hooks/useAppData';
import { requestProfileUpdate } from '../services/eventApi';

export function Profile() {
  const { user, token, updateProfile } = useAuth();
  const { stats } = useAppData();
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [statusMessage, setStatusMessage] = useState('');

  const isAdmin = user?.role === 'admin' || user?.email === 'admin@gmail.com';

  const [photoUrl, setPhotoUrl] = useState(user?.avatar || null);
  useEffect(() => {
    setPhotoUrl(user?.avatar || null);
    setFullName(user?.name || '');
    setEmail(user?.email || '');
  }, [user?.avatar, user?.name, user?.email]);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const uploadRef = useRef(null);

  const persistProfileSnapshot = useCallback(async (nextPhoto) => {
    const safeName = (fullName || user?.name || '').trim();
    const safeEmail = (email || user?.email || '').trim();
    if (!safeName || !safeEmail || !token) {
      setPhotoUrl(nextPhoto);
      updateProfile({ avatar: nextPhoto });
      return;
    }

    const response = await requestProfileUpdate({
      name: safeName,
      email: safeEmail,
      photoPath: nextPhoto,
      token,
    });

    setPhotoUrl(response.candidate.photo_path || nextPhoto);
    setFullName(response.candidate.name);
    setEmail(response.candidate.email);
    updateProfile({
      name: response.candidate.name,
      email: response.candidate.email,
      avatar: response.candidate.photo_path || nextPhoto,
    });
    return response;
  }, [email, fullName, token, updateProfile, user?.email, user?.name]);

  const handleUploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      try {
        await persistProfileSnapshot(dataUrl);
        setStatusMessage('Photo uploaded and saved to your backend profile.');
      } catch (error) {
        setStatusMessage(error.message || 'Unable to save uploaded photo.');
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const startCamera = useCallback(async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320, facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setStatusMessage('Camera access denied. Please allow camera permissions.');
      setShowCamera(false);
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 320, 320);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    try {
      await persistProfileSnapshot(dataUrl);
      setStatusMessage('Photo captured and saved to your backend profile.');
    } catch (error) {
      setStatusMessage(error.message || 'Unable to save captured photo.');
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, [persistProfileSnapshot]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await requestProfileUpdate({
        name: fullName,
        email,
        photoPath: photoUrl,
        token,
      });
      setPhotoUrl(response.candidate.photo_path || photoUrl);
      updateProfile({
        name: response.candidate.name,
        email: response.candidate.email,
        avatar: response.candidate.photo_path || photoUrl,
      });
      setStatusMessage('Profile information updated successfully.');
    } catch (error) {
      setStatusMessage(error.message || 'Unable to update profile information.');
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
            {isAdmin ? "Admin Profile & Credentials" : "My Profile"}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {isAdmin
              ? "Manage your admin credentials and platform photo."
              : "Manage your account details, identity photo, and view your exam performance."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Personal Info Form */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmit} className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
              <h2 className="mb-6 font-headline-md text-headline-md text-on-surface flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-primary">person</span>
                Account Details
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    System Role
                  </label>
                  <input
                    type="text"
                    value={isAdmin ? "Admin" : "Student"}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 opacity-60 text-sm text-on-surface font-semibold"
                  />
                </div>

                {!isAdmin && <div>
                  <label className="mb-2 block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={user?.id || ''}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 opacity-60 text-sm text-on-surface font-mono"
                  />
                </div>}
              </div>

              {statusMessage && (
                <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-600 font-bold text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  {statusMessage}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full mt-6 py-3 font-bold">
                Save Changes
              </Button>
            </form>
          </div>

          {/* Right Column: Photo & Performance */}
          <div className="lg:col-span-5 space-y-6">
            {/* Identity Photo Card with Camera Capture */}
            <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm text-center">
              <h3 className="font-bold text-base text-on-surface mb-5 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-primary">face</span>
                {isAdmin ? "Admin Photo" : "Identity Photo"}
              </h3>

              {showCamera ? (
                <div className="space-y-4">
                  <div className="relative mx-auto w-48 h-48 rounded-2xl overflow-hidden border-4 border-primary/30 bg-black shadow-lg">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs shadow hover:brightness-110 transition flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">photo_camera</span>
                      Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-xs hover:bg-surface-container-high transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative mx-auto w-40 h-40 rounded-full overflow-hidden border-4 border-primary/20 bg-surface-container-high shadow-lg mb-4 flex items-center justify-center">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/10 text-primary font-bold text-4xl flex items-center justify-center">
                        {getInitials(user?.name)}
                      </div>
                    )}
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-600 font-bold text-xs mb-4">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    <span>{photoUrl ? "Photo Registered" : "No Photo Yet"}</span>
                  </div>

                  <h4 className="font-bold text-lg text-on-surface">{user?.name}</h4>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">{user?.email}</p>

                  {/* Camera Button - always show for admin, show for student if no photo */}
                  {(isAdmin || !photoUrl) && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 py-3 text-xs font-bold text-primary border border-primary/20 hover:bg-primary/20 transition"
                      >
                        <span className="material-symbols-outlined text-base">photo_camera</span>
                        {photoUrl ? "Capture Photo" : "Capture Identity Photo"}
                      </button>
                      <button type="button" onClick={() => uploadRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-high px-3 py-3 text-xs font-bold text-on-surface hover:bg-surface-container-highest"><span className="material-symbols-outlined text-base">upload</span>Upload Photo</button>
                      <input ref={uploadRef} type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Performance Summary */}
            <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
              <h3 className="font-bold text-base text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">bar_chart</span>
                {isAdmin ? "Platform Overview" : "Exam Performance"}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-surface-container-low p-4 text-center border border-outline-variant">
                  <p className="text-[11px] text-on-surface-variant uppercase font-semibold">
                    {isAdmin ? "Students" : "Exams Taken"}
                  </p>
                  <p className="mt-1 text-2xl text-on-surface font-bold">
                    {isAdmin ? '—' : stats.completedExams}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-4 text-center border border-outline-variant">
                  <p className="text-[11px] text-on-surface-variant uppercase font-semibold">Avg Score</p>
                  <p className="mt-1 text-2xl text-primary font-bold">
                    {stats.completedExams ? `${stats.averageScore}%` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Profile;
