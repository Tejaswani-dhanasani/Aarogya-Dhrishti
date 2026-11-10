import { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Camera, CheckCircle2, AlertCircle, X, Loader2, User, Stethoscope, Cigarette, ImagePlus, Check, ArrowLeft, ArrowRight, Video, VideoOff, Plus } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { formatAbha } from '../utils.js';
import { useLang } from '../lang.jsx';
import { getOpenCv } from '../opencv.js';
import { useAuth } from '../auth.jsx';
import { saveQueuedPatient } from '../offlinePatientQueue.js';

const BLOOD = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const HABITS = ['Tobacco chewing', 'Smoking', 'Gutkha', 'Areca nut / betel quid', 'Alcohol', 'Reverse chutta smoking'];
const SYMPTOMS = ['Non-healing mouth ulcer', 'White patch', 'Red patch', 'Pain in mouth', 'Difficulty swallowing', 'Limited mouth opening', 'Neck swelling'];
const STEPS = [['Patient', User], ['Symptoms', Stethoscope], ['Habits', Cigarette], ['Photo & consent', ImagePlus]];
const STEP_FIELDS = [['name', 'mobile', 'age', 'gender', 'abha_number'], [], [], ['consent']];

async function checkPhotoQuality(file) {
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 512 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(3, Math.round(image.width * scale));
    canvas.height = Math.max(3, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image analysis is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const cv = await getOpenCv();
    const matrices = [];

    try {
      const source = cv.imread(canvas);
      matrices.push(source);
      const grayscale = new cv.Mat();
      matrices.push(grayscale);
      const laplacian = new cv.Mat();
      matrices.push(laplacian);
      const mean = new cv.Mat();
      matrices.push(mean);
      const standardDeviation = new cv.Mat();
      matrices.push(standardDeviation);
      const darkPixels = new cv.Mat();
      matrices.push(darkPixels);
      const brightPixels = new cv.Mat();
      matrices.push(brightPixels);

      cv.cvtColor(source, grayscale, cv.COLOR_RGBA2GRAY);
      cv.Laplacian(grayscale, laplacian, cv.CV_64F);
      cv.meanStdDev(laplacian, mean, standardDeviation);
      const sharpness = standardDeviation.data64F[0] ** 2;
      cv.meanStdDev(grayscale, mean, standardDeviation);
      const averageBrightness = mean.data64F[0];
      cv.threshold(grayscale, darkPixels, 30, 255, cv.THRESH_BINARY_INV);
      cv.threshold(grayscale, brightPixels, 225, 255, cv.THRESH_BINARY);
      const pixelCount = grayscale.rows * grayscale.cols;
      const darkRatio = cv.countNonZero(darkPixels) / pixelCount;
      const brightRatio = cv.countNonZero(brightPixels) / pixelCount;

      return {
        blurry: sharpness < 45,
        lowResolution: image.width < 640 || image.height < 480,
        poorLighting: averageBrightness < 45 || averageBrightness > 210
          || darkRatio > 0.6
          || brightRatio > 0.6,
        width: image.width,
        height: image.height
      };
    } finally {
      matrices.reverse().forEach((matrix) => matrix.delete());
    }
  } finally {
    image.close();
  }
}

// Selectable chips: click to add a symptom/habit, then fill in how long.
function ChipPicker({ options, fields, nameKey, placeholder, onAdd, onRemove, register, prefix }) {
  const has = (o) => fields.some((f) => f[nameKey] === o);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button type="button" key={o} onClick={() => (has(o) ? onRemove(fields.findIndex((f) => f[nameKey] === o)) : onAdd(o))}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${has(o) ? 'border-primary-600 bg-primary-600 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-primary-400'}`}>
            {has(o) && <Check size={14} />}{o}
          </button>
        ))}
      </div>
      {fields.length > 0 && (
        <div className="mt-5 space-y-2.5">
          {fields.map((f, i) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-2.5 ring-1 ring-neutral-200">
              <span className="min-w-0 flex-1 truncate pl-1 text-sm font-medium">{f[nameKey]}</span>
              <input className="input w-36 shrink-0" placeholder={placeholder} {...register(`${prefix}.${i}.duration`)} />
              <button type="button" onClick={() => onRemove(i)} className="rounded-lg p-2 text-neutral-400 hover:bg-error-50 hover:text-error-600" aria-label="Remove"><X size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientForm({ onSaved, initialPatient = null, onCancel }) {
  const { t } = useLang();
  const { user } = useAuth();
  const isEditing = Boolean(initialPatient);
  const { register, control, handleSubmit, reset, trigger, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: initialPatient ? {
      ...initialPatient,
      age: String(initialPatient.age),
      symptoms: initialPatient.symptoms || [],
      habits: initialPatient.habits || [],
      consent: initialPatient.consent
    } : { symptoms: [], habits: [], tobacco: 'None', blood_group: 'Unknown', gender: '' },
  });
  const sym = useFieldArray({ control, name: 'symptoms' });
  const hab = useFieldArray({ control, name: 'habits' });
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState([]);
  const [duplicateAccepted, setDuplicateAccepted] = useState(false);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [photoQuality, setPhotoQuality] = useState(null);
  const [customSymptom, setCustomSymptom] = useState('');
  const [symptomError, setSymptomError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const previewUrlRef = useRef(null);
  const photoCheckIdRef = useRef(0);
  const clientIdRef = useRef(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => {
    if (step !== 3 && streamRef.current) stopCamera();
  }, [step]);

  const setPhoto = (nextFile) => {
    photoCheckIdRef.current += 1;
    const checkId = photoCheckIdRef.current;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreview = nextFile ? URL.createObjectURL(nextFile) : null;
    previewUrlRef.current = nextPreview;
    setFile(nextFile);
    if (nextFile) setRemoveExistingPhoto(false);
    setPreview(nextPreview);
    setPhotoQuality(nextFile ? { status: 'checking' } : null);
    if (nextFile) {
      checkPhotoQuality(nextFile).then((quality) => {
        if (photoCheckIdRef.current === checkId) {
          setPhotoQuality({ status: 'checked', ...quality });
        }
      }).catch(() => {
        if (photoCheckIdRef.current === checkId) {
          setPhotoQuality({ status: 'error' });
        }
      });
    }
  };

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        setCameraError('The camera preview could not start. Check browser camera permissions and try again.');
      });
    }
  }, [cameraActive]);

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera capture is unavailable in this browser or page context. Use the photo picker instead.');
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      setCameraActive(true);
    } catch (cameraFailure) {
      const message = cameraFailure.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access in your browser settings or use the photo picker.'
        : cameraFailure.name === 'NotFoundError'
          ? 'No camera was found. Use the photo picker to select an image.'
          : 'Unable to access the camera. Check that it is connected and not being used by another app.';
      setCameraError(message);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('The camera is not ready yet. Wait for the preview and try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Image capture is unavailable in this browser.');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('The image could not be captured. Please try again.');
        return;
      }
      setPhoto(new File([blob], `patient-photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      setCameraError('');
      stopCamera();
    }, 'image/jpeg', 0.82);
  };

  const next = async () => { if (await trigger(STEP_FIELDS[step])) setStep((s) => Math.min(s + 1, 3)); };
  const err = (k) => errors[k] && <p className="mt-1 text-xs text-error-600">{errors[k].message}</p>;

  const addCustomSymptom = () => {
    const enteredName = customSymptom.trim();
    if (!enteredName) {
      setSymptomError('Enter a symptom to add.');
      return;
    }
    const name = SYMPTOMS.find((symptom) => symptom.toLowerCase() === enteredName.toLowerCase()) || enteredName;
    if (sym.fields.some((symptom) => symptom.name.toLowerCase() === name.toLowerCase())) {
      setSymptomError('This symptom is already listed.');
      return;
    }
    sym.append({ name, duration: '' });
    setCustomSymptom('');
    setSymptomError('');
  };

  const onSubmit = async (d, allowDuplicate = duplicateAccepted) => {
    setError('');
    stopCamera();
    const fd = new FormData();
    ['name', 'age', 'gender', 'mobile', 'village', 'abha_number', 'blood_group', 'previous_health', 'medications', 'tobacco'].forEach((k) => fd.append(k, d[k] ?? ''));
    fd.append('symptoms', JSON.stringify(d.symptoms));
    fd.append('habits', JSON.stringify(d.habits));
    fd.append('consent', String(d.consent));
    if (file) fd.append('picture', file);
    if (removeExistingPhoto) fd.append('remove_picture', 'true');

    if (isEditing) {
      try {
        await api.put(`/patients/${initialPatient.id}`, fd);
        setSaved(true);
        onSaved?.();
      } catch (requestError) {
        setError(errMsg(requestError));
      }
      return;
    }

    clientIdRef.current ||= crypto.randomUUID();
    fd.append('client_id', clientIdRef.current);
    if (allowDuplicate) fd.append('allow_duplicate', 'true');
    try {
      await api.post('/patients', fd, {
        headers: { 'Idempotency-Key': clientIdRef.current }
      });
      setSaved(true);
      setOfflineSaved(false);
      setDuplicateCandidates([]);
      onSaved?.();
    } catch (requestError) {
      if (requestError.response?.status === 409 && requestError.response.data?.duplicateCandidates) {
        setDuplicateCandidates(requestError.response.data.duplicateCandidates);
        setDuplicateAccepted(false);
        return;
      }
      if (!requestError.response && !requestError.code?.includes('CANCEL')) {
        try {
          await saveQueuedPatient({
            clientId: clientIdRef.current,
            workerId: String(user.id),
            createdAt: new Date().toISOString(),
            patient: {
              name: d.name.trim(),
              age: String(d.age),
              gender: d.gender,
              mobile: d.mobile,
              village: d.village || '',
              abha_number: d.abha_number || '',
              blood_group: d.blood_group || '',
              previous_health: d.previous_health || '',
              medications: d.medications || '',
              tobacco: d.tobacco || 'None',
              symptoms: d.symptoms,
              habits: d.habits,
              consent: String(d.consent),
              picture: file
            }
          });
          window.dispatchEvent(new Event('patient-queue-updated'));
          setSaved(true);
          setOfflineSaved(true);
          onSaved?.({ offline: true });
          return;
        } catch (storageError) {
          console.error('Unable to queue patient for offline sync:', storageError);
          setError('Network unavailable and this record could not be saved on this device. Keep this page open and retry.');
          return;
        }
      }
      setError(errMsg(requestError));
    }
  };

  const again = () => {
    stopCamera();
    reset({ symptoms: [], habits: [], tobacco: 'None', blood_group: 'Unknown', gender: '' });
    setPhoto(null);
    setStep(0);
    setSaved(false);
    setOfflineSaved(false);
    setError('');
    setCameraError('');
    setDuplicateCandidates([]);
    setDuplicateAccepted(false);
    clientIdRef.current = null;
  };

  if (saved) {
    return (
      <div className="card mx-auto max-w-xl animate-fade-up py-12 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-100 text-success-600"><CheckCircle2 size={34} /></span>
        <h2 className="mt-5 text-2xl font-bold">{offlineSaved ? 'Saved on this device' : isEditing ? 'Patient updated' : 'Patient saved'}</h2>
        <p className="mt-1 text-neutral-500">
          {offlineSaved
            ? 'This record is waiting to sync. It is stored unencrypted in this browser on this device.'
            : isEditing ? 'The patient record has been updated.' : 'The record is now visible to the medical team.'}
        </p>
        {offlineSaved && <p className="mx-auto mt-3 max-w-md text-sm text-warning-800">Do not use offline storage on a shared or unsecured device. Keep this device protected until the record syncs.</p>}
        {!isEditing && <button className="btn mt-6" onClick={again}>Add another patient</button>}
        {isEditing && <button className="btn mt-6" onClick={onCancel}>Done</button>}
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { if (step < 3) { e.preventDefault(); next(); } else handleSubmit(onSubmit)(e); }} noValidate className="mx-auto max-w-3xl">
      {/* progress */}
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map(([label, Icon], i) => (
          <li key={label} className="flex flex-col items-center gap-1.5 text-center">
            <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold transition ${i < step ? 'bg-primary-600 text-white' : i === step ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600' : 'bg-neutral-200 text-neutral-500'}`}>
              {i < step ? <Check size={18} /> : <Icon size={18} />}
            </span>
            <span className={`text-[11px] font-semibold sm:text-xs ${i === step ? 'text-primary-700' : 'text-neutral-500'}`}>{label}</span>
          </li>
        ))}
      </ol>

      <div className="card animate-fade-in p-6 sm:p-8" key={step}>
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Name</label><input className="input" {...register('name', { required: 'Required' })} />{err('name')}</div>
            <div><label className="label">Mobile number</label><input className="input" inputMode="numeric" maxLength={10} {...register('mobile', { required: 'Required', pattern: { value: /^\d{10}$/, message: '10 digits' } })} />{err('mobile')}</div>
            <div><label className="label">Age</label><input className="input" type="number" {...register('age', { required: 'Required', min: { value: 1, message: 'Invalid' }, max: { value: 120, message: 'Invalid' } })} />{err('age')}</div>
            <div><label className="label">Gender</label>
              <select className="input" {...register('gender', { required: 'Required' })}>
                <option value="" disabled>Select…</option><option>Female</option><option>Male</option><option>Other</option>
              </select>{err('gender')}</div>
            <div><label className="label">Village</label><input className="input" {...register('village')} /></div>
            <div><label className="label">Blood group</label>
              <select className="input" {...register('blood_group')}>{BLOOD.map((b) => <option key={b}>{b}</option>)}</select></div>
            <div className="sm:col-span-2">
              <label className="label">ABHA number <span className="font-normal text-neutral-400">(optional, 14 digits)</span></label>
              <input className="input font-mono tracking-wider" inputMode="numeric" placeholder="12-3456-7890-1234"
                {...register('abha_number', {
                  validate: (v) => !v || v.replace(/\D/g, '').length === 14 || 'ABHA number must be 14 digits',
                  onChange: (e) => setValue('abha_number', formatAbha(e.target.value)),
                })} />
              {err('abha_number')}
              <p className="mt-1 text-xs text-neutral-500">Ayushman Bharat Health Account ID, if the patient already has one.</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold">What symptoms does the patient have?</h2>
            <p className="mb-4 mt-0.5 text-sm text-neutral-500">Tap to select, then enter how long (for example 3 weeks).</p>
            <ChipPicker options={SYMPTOMS} fields={sym.fields} nameKey="name" placeholder="e.g. 3 weeks" prefix="symptoms"
              register={register} onAdd={(n) => sym.append({ name: n, duration: '' })} onRemove={sym.remove} />
            <div className="mt-6">
              <label className="label" htmlFor="custom-symptom">Other symptom</label>
              <div className="flex gap-2">
                <input id="custom-symptom" className="input" value={customSymptom}
                  onChange={(e) => { setCustomSymptom(e.target.value); setSymptomError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSymptom(); } }}
                  placeholder="Type a symptom not listed above" />
                <button type="button" className="btn shrink-0" onClick={addCustomSymptom}><Plus size={16} />Add</button>
              </div>
              {symptomError && <p role="alert" className="mt-1 text-xs text-error-600">{symptomError}</p>}
              {sym.fields.some((symptom) => !SYMPTOMS.includes(symptom.name)) && (
                <div className="mt-5 space-y-2.5">
                  {sym.fields.map((symptom, index) => !SYMPTOMS.includes(symptom.name) && (
                    <div key={symptom.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-2.5 ring-1 ring-neutral-200">
                      <span className="min-w-0 flex-1 truncate pl-1 text-sm font-medium">{symptom.name}</span>
                      <input className="input w-36 shrink-0" placeholder="e.g. 3 weeks" {...register(`symptoms.${index}.duration`)} />
                      <button type="button" onClick={() => sym.remove(index)} className="rounded-lg p-2 text-neutral-400 hover:bg-error-50 hover:text-error-600" aria-label={`Remove ${symptom.name}`}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Previous health problems</label><textarea rows="3" className="input" {...register('previous_health')} /></div>
              <div><label className="label">Current medications</label><textarea rows="3" className="input" {...register('medications')} /></div>
            </div>
            <div className="max-w-xs"><label className="label">Tobacco use</label>
              <select className="input" {...register('tobacco')}><option>None</option><option>Smokeless (chewing)</option><option>Smoking</option><option>Both</option></select></div>
            <div>
              <p className="label">Habits and duration</p>
              <ChipPicker options={HABITS} fields={hab.fields} nameKey="habit" placeholder="e.g. 10 years" prefix="habits"
                register={register} onAdd={(n) => hab.append({ habit: n, duration: '' })} onRemove={hab.remove} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <p className="label">Oral photo</p>
              {cameraActive ? (
                <div className="space-y-3">
                  <video ref={videoRef} autoPlay playsInline muted className="max-h-80 w-full rounded-2xl bg-neutral-900 object-contain" aria-label="Live camera preview" />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn" onClick={capturePhoto}><Camera size={16} />Capture image</button>
                    <button type="button" className="btn-ghost" onClick={stopCamera}><VideoOff size={16} />Stop camera</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/60 p-4 sm:flex-row sm:items-center">
                  <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-primary-600 ring-1 ring-primary-200">
                    {preview ? <img src={preview} alt="Captured patient photo preview" className="h-full w-full object-cover" /> : initialPatient?.picture_path && !removeExistingPhoto ? <img src={`${api.defaults.baseURL.replace(/\/api$/, '')}${initialPatient.picture_path}`} alt="Current patient photo" className="h-full w-full object-cover" /> : <Camera size={28} />}
                  </span>
                  <div className="flex-1 text-sm text-neutral-600">
                    <b className="block text-neutral-800">{preview ? 'Photo ready' : 'Capture or choose a photo'}</b>
                    <p className="mt-1">Use the camera for a live image or select an existing photo.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="btn" onClick={startCamera}><Video size={16} />Open camera</button>
                      <label className="btn-outline cursor-pointer">
                        <ImagePlus size={16} />{preview ? 'Choose another photo' : 'Choose photo'}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            const selected = e.target.files?.[0];
                            e.target.value = '';
                            if (!selected) return;
                            if (!selected.type.startsWith('image/')) {
                              setCameraError('Please choose an image file.');
                            } else {
                              setPhoto(selected);
                              setCameraError('');
                            }
                          }} />
                      </label>
                      {(preview || (isEditing && initialPatient.picture_path && !removeExistingPhoto)) && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            if (preview) setPhoto(null);
                            else setRemoveExistingPhoto(true);
                          }}
                        >
                          <X size={16} />Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {cameraError && <p role="alert" className="mt-2 flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700"><AlertCircle size={16} />{cameraError}</p>}
              {photoQuality?.status === 'checking' && (
                <p role="status" className="mt-3 flex items-center gap-2 text-sm text-neutral-600"><Loader2 className="animate-spin" size={16} />Checking photo quality on this device…</p>
              )}
              {photoQuality?.status === 'checked' && (
                <div role={photoQuality.blurry ? 'alert' : 'status'} className={`mt-3 rounded-xl p-3 text-sm ${photoQuality.blurry || photoQuality.lowResolution || photoQuality.poorLighting ? 'bg-warning-50 text-warning-800' : 'bg-success-50 text-success-700'}`}>
                  <p className="flex items-center gap-2 font-semibold">
                    {photoQuality.blurry || photoQuality.lowResolution || photoQuality.poorLighting
                      ? <AlertCircle size={16} />
                      : <CheckCircle2 size={16} />}
                    On-device photo quality check
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    <li>{photoQuality.blurry ? 'Focus: image may be blurry; retake it while holding the camera steady.' : 'Focus: no obvious blur detected.'}</li>
                    <li>{photoQuality.lowResolution ? `Image size: ${photoQuality.width} × ${photoQuality.height}; use at least 640 × 480 pixels if possible.` : `Image size: ${photoQuality.width} × ${photoQuality.height} pixels.`}</li>
                    <li>{photoQuality.poorLighting ? 'Lighting: image may be too dark or too bright; adjust lighting and retake it if possible.' : 'Lighting: no obvious overall exposure issue detected.'}</li>
                  </ul>
                </div>
              )}
              {photoQuality?.status === 'error' && (
                <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-warning-50 p-3 text-sm text-warning-800">
                  <AlertCircle size={16} />
                  This image could not be checked. Please choose or capture another image.
                </p>
              )}
              {duplicateCandidates.length > 0 && (
                <div className="mt-4 rounded-xl border border-warning-300 bg-warning-50 p-4 text-sm text-warning-900" role="alert">
                  <p className="font-semibold">Possible duplicate patient record</p>
                  <p className="mt-1">The mobile number or ABHA number matches an existing record. Review these records before continuing:</p>
                  <ul className="mt-2 list-inside list-disc">
                    {duplicateCandidates.map((candidate) => (
                      <li key={candidate.id}>{candidate.name} · Patient #{candidate.id} · {candidate.mobile}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn" onClick={() => setDuplicateCandidates([])}>Review existing record</button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={handleSubmit((data) => onSubmit(data, true))}
                      disabled={isSubmitting}
                    >
                      Continue as a separate patient
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs text-neutral-500">This check runs on this device and assesses only blur, image size, and overall lighting. It does not interpret the mouth image or detect disease. No clinical AI screening service is connected; a health professional must review the image and symptoms.</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-4 ring-1 ring-neutral-200">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-primary-600" {...register('consent', { required: 'Consent is required' })} />
                <span>The patient has been informed and agrees to oral screening, photographs, and sharing of this information with the medical officer and specialist for care. <span className="text-neutral-400">(Demo data only.)</span></span>
              </label>{err('consent')}
            </div>
            {error && <p className="flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700"><AlertCircle size={16} />{error}</p>}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-2">
          {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
          <button type="button" className="btn-ghost" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}><ArrowLeft size={16} />{t('back')}</button>
        </div>
        {step < 3
          ? <button type="submit" className="btn">{t('next')}<ArrowRight size={16} /></button>
          : <button type="submit" className="btn" disabled={isSubmitting || photoQuality?.status === 'checking' || photoQuality?.blurry || photoQuality?.status === 'error'}>{isSubmitting && <Loader2 className="animate-spin" size={16} />}{isEditing ? 'Save changes' : t('save')}</button>}
      </div>
    </form>
  );
}
