/**
 * ══════════════════════════════════════════════════════════════════════
 * 🩺 DOCSEE SUPABASE CLIENT & CLINICAL DATA LAYER
 * Handles Cloud PostgreSQL Database Sync, Patient Ingestion, Case Sheets & OPD Queue
 * ══════════════════════════════════════════════════════════════════════
 */

// Default Supabase Config for Project: ydnbeojecurymwtqlntr
const DEFAULT_SUPABASE_CONFIG = {
  url: localStorage.getItem('DOCSEE_SUPABASE_URL') || 'https://ydnbeojecurymwtqlntr.supabase.co',
  anonKey: localStorage.getItem('DOCSEE_SUPABASE_KEY') || 'sb_publishable_zDRl7MmUt5wbDTJLrVaidg_FdwJHARc',
  isConnected: false
};

class DocSeeDatabase {
  constructor() {
    this.client = null;
    this.config = { ...DEFAULT_SUPABASE_CONFIG };
    this.localQueueKey = 'DOCSEE_LOCAL_QUEUE_V1';
    this.localCasesKey = 'DOCSEE_LOCAL_CASES_V1';
    this.tokenCounterKey = 'DOCSEE_TOKEN_COUNTER';
    this.init();
  }

  init() {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        if (this.config.url && this.config.url.startsWith('https://') && this.config.anonKey && this.config.anonKey.length > 10) {
          this.client = window.supabase.createClient(this.config.url, this.config.anonKey);
          this.config.isConnected = true;
          console.log('✅ [DocSee] Connected to Supabase Cloud Database:', this.config.url);
        }
      } catch (err) {
        console.warn('⚠️ [DocSee] Supabase init warning, using resilient fallback store:', err.message);
      }
    } else {
      console.log('ℹ️ [DocSee] Supabase client initialized in local-first hybrid mode.');
    }
    this.initLocalStore();
  }

  // Generate clean sequential token numbers: 1, 2, 3, 4, ... up to infinity
  getNextTokenNumber() {
    let current = parseInt(localStorage.getItem(this.tokenCounterKey) || '0', 10);
    if (isNaN(current) || current < 0) current = 0;
    current += 1;
    localStorage.setItem(this.tokenCounterKey, current.toString());
    return current;
  }

  initLocalStore() {
    // Reset token counter if it was never set OR if it got corrupted to 1000+
    const savedCounter = localStorage.getItem(this.tokenCounterKey);
    const counterVal = parseInt(savedCounter || '0', 10);
    if (!savedCounter || isNaN(counterVal) || counterVal >= 1000) {
      localStorage.setItem(this.tokenCounterKey, '3');
    }

    if (!localStorage.getItem(this.localQueueKey)) {
      const defaultQueue = [
        {
          id: 'case-001',
          token_number: '1',
          patient_name: 'Meena Kumari',
          age: 58,
          gender: 'Female',
          department: 'General Medicine',
          chief_complaint: 'Chest discomfort + breathlessness',
          priority_level: 'Priority',
          status: 'priority',
          estimated_wait_min: 5,
          vitals: { bpSys: '148', bpDia: '92', hr: 88, temp: '98.4', spo2: 97, rbs: 164 },
          created_at: new Date().toISOString()
        },
        {
          id: 'case-002',
          token_number: '2',
          patient_name: 'Ravi Shankar',
          age: 42,
          gender: 'Male',
          department: 'Ayurveda OPD',
          chief_complaint: 'Indigestion, irregular sleep',
          priority_level: 'Standard',
          status: 'ready',
          estimated_wait_min: 12,
          vitals: { bpSys: '120', bpDia: '80', hr: 74, temp: '98.6', spo2: 98, rbs: 105 },
          created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString()
        },
        {
          id: 'case-003',
          token_number: '3',
          patient_name: 'Sunita Devi',
          age: 62,
          gender: 'Female',
          department: 'General Medicine',
          chief_complaint: 'High fever + productive cough (SpO2 93%)',
          priority_level: 'Emergency',
          status: 'priority',
          estimated_wait_min: 2,
          vitals: { bpSys: '118', bpDia: '76', hr: 102, temp: '102.1', spo2: 93, rbs: 128 },
          created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString()
        }
      ];
      localStorage.setItem(this.localQueueKey, JSON.stringify(defaultQueue));
    }

    if (!localStorage.getItem(this.localCasesKey)) {
      const defaultCases = {
        "1": {
          id: 'case-001',
          token_number: '1',
          patient_name: 'Meena Kumari',
          age: 58,
          gender: 'Female',
          department: 'General Medicine',
          chief_complaint: 'Chest discomfort + breathlessness',
          symptoms_narrative: 'Central, pressure-like chest discomfort radiating to left shoulder with shortness of breath on exertion.',
          existing_conditions: ['Type-2 Diabetes Mellitus (8 yrs)', 'Essential Hypertension (5 yrs)'],
          current_medications: 'Metformin 500mg BD, Amlodipine 5mg OD',
          known_allergies: 'Penicillin (Severe urticaria)',
          past_surgeries: 'Cholecystectomy (2018)',
          family_history: ['Diabetes in mother', 'Hypertension in father'],
          vitals: { bpSys: '148', bpDia: '92', hr: 88, temp: '98.4', spo2: 97, weight: 65, rbs: 164 },
          priority_level: 'Priority',
          status: 'waiting',
          clinical_summary: 'Patient Meena Kumari (58y/Female) presents with chest discomfort and breathlessness. Vitals: BP 148/92, SpO2 97%, HR 88 bpm. Priority: High.',
          created_at: new Date().toISOString()
        }
      };
      localStorage.setItem(this.localCasesKey, JSON.stringify(defaultCases));
    }
  }

  // Update Supabase Project Credentials
  updateConfig(url, key) {
    if (!url || !key) return { success: false, message: 'URL and Anon Key are required.' };
    this.config.url = url.trim();
    this.config.anonKey = key.trim();
    localStorage.setItem('DOCSEE_SUPABASE_URL', this.config.url);
    localStorage.setItem('DOCSEE_SUPABASE_KEY', this.config.anonKey);
    
    try {
      if (window.supabase) {
        this.client = window.supabase.createClient(this.config.url, this.config.anonKey);
        this.config.isConnected = true;
        return { success: true, message: 'Successfully connected to Supabase cloud database!' };
      }
    } catch (e) {
      return { success: false, message: 'Connection failed: ' + e.message };
    }
    return { success: true, message: 'Configuration saved. Ready for sync.' };
  }

  // 1. SAVE PATIENT INTAKE & CREATE DIGITAL CASE RECORD
  async savePatientIntake(caseData) {
    const timestamp = new Date().toISOString();
    
    // Assign sequential token: 1, 2, 3, 4, ...
    let token = caseData.tokenNumber;
    if (!token || typeof token !== 'string' || token.startsWith('A-') || isNaN(parseInt(token, 10))) {
      token = this.getNextTokenNumber().toString();
    } else {
      // Ensure token counter stays ahead
      const numVal = parseInt(token, 10);
      const currentCounter = parseInt(localStorage.getItem(this.tokenCounterKey) || '0', 10);
      if (!isNaN(numVal) && numVal >= currentCounter) {
        localStorage.setItem(this.tokenCounterKey, numVal.toString());
      }
    }
    
    // Auto calculate triage priority
    let priority = 'Standard';
    if ((caseData.vitals && caseData.vitals.spo2 && parseInt(caseData.vitals.spo2) < 94) || 
        (caseData.vitals && caseData.vitals.bpSys && parseInt(caseData.vitals.bpSys) > 175) ||
        (caseData.complaint && caseData.complaint.toLowerCase().includes('chest'))) {
      priority = 'Priority';
    }
    if ((caseData.vitals && caseData.vitals.spo2 && parseInt(caseData.vitals.spo2) < 90) || 
        (caseData.vitals && caseData.vitals.bpSys && parseInt(caseData.vitals.bpSys) > 200)) {
      priority = 'Emergency';
    }

    const patientRecord = {
      id: 'pat-' + Date.now(),
      token_number: token,
      full_name: caseData.name || 'Anonymous Patient',
      age: parseInt(caseData.age) || 0,
      gender: caseData.gender || 'Not specified',
      phone: caseData.phone || '',
      abha_id: caseData.abha || ('91-' + Math.floor(1000+Math.random()*9000) + '-' + Math.floor(1000+Math.random()*9000) + '-' + Math.floor(1000+Math.random()*9000)),
      department: caseData.department || 'General Medicine',
      language: caseData.language || 'en',
      address: caseData.address || '',
      created_at: timestamp
    };

    const caseRecord = {
      id: 'case-' + Date.now(),
      token_number: token,
      patient_name: patientRecord.full_name,
      age: patientRecord.age,
      gender: patientRecord.gender,
      department: patientRecord.department,
      chief_complaint: caseData.complaint || 'General Checkup',
      symptoms_narrative: caseData.symptomsDescription || '',
      live_translation_text: caseData.translationText || '',
      dynamic_qa_answers: caseData.qaAnswers || {},
      existing_conditions: caseData.conditions || [],
      current_medications: caseData.medications || 'None',
      known_allergies: caseData.allergies || 'NKDA',
      past_surgeries: caseData.surgeries || 'None',
      family_history: caseData.familyHistory || [],
      vitals: caseData.vitals || {},
      priority_level: priority,
      status: priority === 'Priority' || priority === 'Emergency' ? 'priority' : 'waiting',
      clinical_summary: `Patient ${patientRecord.full_name} (${patientRecord.age}y/${patientRecord.gender}) presents with ${caseData.complaint || 'unspecified complaint'}. Vitals: BP ${caseData.vitals?.bpSys || 120}/${caseData.vitals?.bpDia || 80}, SpO2 ${caseData.vitals?.spo2 || 98}%, HR ${caseData.vitals?.hr || 74} bpm. Priority: ${priority}.`,
      created_at: timestamp
    };

    // Save to LocalStorage first (instant UI responsiveness & offline resiliency)
    const localQueue = JSON.parse(localStorage.getItem(this.localQueueKey) || '[]');
    // Filter out existing token if duplicate
    const updatedQueue = localQueue.filter(q => q.token_number !== token);
    updatedQueue.unshift({
      id: caseRecord.id,
      token_number: token,
      patient_name: patientRecord.full_name,
      age: patientRecord.age,
      gender: patientRecord.gender,
      department: patientRecord.department,
      chief_complaint: caseRecord.chief_complaint,
      priority_level: priority,
      status: caseRecord.status,
      estimated_wait_min: Math.floor(6 + Math.random() * 12),
      vitals: caseRecord.vitals,
      created_at: timestamp
    });
    localStorage.setItem(this.localQueueKey, JSON.stringify(updatedQueue));

    const localCases = JSON.parse(localStorage.getItem(this.localCasesKey) || '{}');
    localCases[token] = caseRecord;
    localStorage.setItem(this.localCasesKey, JSON.stringify(localCases));

    // Dispatch custom event for real-time app update in same window / listeners
    try {
      window.dispatchEvent(new CustomEvent('docsee:queue-updated', { detail: { token, caseRecord } }));
    } catch (e) {}

    // Try Supabase Cloud Insert if connected
    if (this.client && this.config.isConnected) {
      try {
        const { data: pData, error: pErr } = await this.client
          .from('docsee_patients')
          .insert([{
            token_number: token,
            full_name: patientRecord.full_name,
            age: patientRecord.age,
            gender: patientRecord.gender,
            phone: patientRecord.phone,
            abha_id: patientRecord.abha_id,
            department: patientRecord.department,
            language: patientRecord.language,
            address: patientRecord.address
          }])
          .select();
        
        if (!pErr && pData && pData[0]) {
          const pId = pData[0].id;
          await this.client.from('docsee_cases').insert([{
            patient_id: pId,
            token_number: token,
            chief_complaint: caseRecord.chief_complaint,
            symptoms_narrative: caseRecord.symptoms_narrative,
            dynamic_qa_answers: caseRecord.dynamic_qa_answers,
            existing_conditions: caseRecord.existing_conditions,
            current_medications: caseRecord.current_medications,
            known_allergies: caseRecord.known_allergies,
            past_surgeries: caseRecord.past_surgeries,
            family_history: caseRecord.family_history,
            bp_systolic: parseInt(caseData.vitals?.bpSys) || 120,
            bp_diastolic: parseInt(caseData.vitals?.bpDia) || 80,
            heart_rate: parseInt(caseData.vitals?.hr) || 72,
            temperature_f: parseFloat(caseData.vitals?.temp) || 98.6,
            spo2_percent: parseInt(caseData.vitals?.spo2) || 98,
            weight_kg: parseFloat(caseData.vitals?.weight) || 65.0,
            rbs_mgdl: parseInt(caseData.vitals?.rbs) || 105,
            priority_level: priority,
            clinical_summary: caseRecord.clinical_summary,
            status: 'waiting'
          }]);

          await this.client.from('docsee_queue').insert([{
            patient_id: pId,
            token_number: token,
            patient_name: patientRecord.full_name,
            age: patientRecord.age,
            gender: patientRecord.gender,
            department: patientRecord.department,
            chief_complaint: caseRecord.chief_complaint,
            priority_level: priority,
            status: 'waiting',
            estimated_wait_min: 12
          }]);

          console.log('☁️ [DocSee] Record synced to Supabase Cloud Database for Token:', token);
        }
      } catch (cloudErr) {
        console.warn('⚠️ [DocSee] Supabase cloud sync deferred (offline/network):', cloudErr.message);
      }
    }

    return { success: true, tokenNumber: token, caseRecord };
  }

  // 2. FETCH OPD PATIENT QUEUE
  async getQueue() {
    if (this.client && this.config.isConnected) {
      try {
        const { data, error } = await this.client
          .from('docsee_queue')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('⚠️ [DocSee] Reading from local storage queue fallback');
      }
    }
    return JSON.parse(localStorage.getItem(this.localQueueKey) || '[]');
  }

  // 3. FETCH CASE SHEET FOR SPECIFIC TOKEN OR PATIENT
  async getCaseSheet(token) {
    if (this.client && this.config.isConnected) {
      try {
        const { data, error } = await this.client
          .from('docsee_cases')
          .select('*, docsee_patients(*)')
          .eq('token_number', token)
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('⚠️ [DocSee] Reading case from local storage');
      }
    }
    const localCases = JSON.parse(localStorage.getItem(this.localCasesKey) || '{}');
    return localCases[token] || null;
  }

  // 4. FETCH ALL LOCAL STORED CASE SHEETS
  getAllCases() {
    return JSON.parse(localStorage.getItem(this.localCasesKey) || '{}');
  }
}

// Global Singleton Instance
window.DocSeeDB = new DocSeeDatabase();
