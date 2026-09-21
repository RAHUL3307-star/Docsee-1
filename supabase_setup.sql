-- ==============================================================================
-- 🩺 DOCSEE — SUPABASE DATABASE SCHEMA (PS 26047 CLINICAL CASE-TAKING ENGINE)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Patients Table
CREATE TABLE IF NOT EXISTS docsee_patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_number VARCHAR(20) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    abha_id VARCHAR(50),
    department VARCHAR(100) DEFAULT 'General Medicine',
    language VARCHAR(30) DEFAULT 'en',
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Digital Clinical Case Records Table (PS 26047 Case Sheet)
CREATE TABLE IF NOT EXISTS docsee_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES docsee_patients(id) ON DELETE CASCADE,
    token_number VARCHAR(20) NOT NULL,
    
    -- Chief Complaint & Narrative (Step 3)
    chief_complaint VARCHAR(100) NOT NULL,
    symptoms_narrative TEXT,
    voice_original_audio_lang VARCHAR(30),
    live_translation_text TEXT,
    dynamic_qa_answers JSONB DEFAULT '{}'::jsonb,
    
    -- Medical, Drug, Surgical, Allergy & Family History (Step 4)
    existing_conditions TEXT[] DEFAULT '{}',
    current_medications TEXT,
    known_allergies TEXT,
    past_surgeries TEXT,
    family_history TEXT[] DEFAULT '{}',
    
    -- Vitals & Examination (Step 5)
    bp_systolic INT,
    bp_diastolic INT,
    heart_rate INT,
    temperature_f NUMERIC(4,1),
    spo2_percent INT,
    weight_kg NUMERIC(5,2),
    rbs_mgdl INT,
    doctor_additional_notes TEXT,
    
    -- Triage & Clinical AI Insights
    priority_level VARCHAR(20) DEFAULT 'Standard', -- 'Emergency', 'Priority', 'Standard'
    clinical_summary TEXT,
    suggested_opening_question TEXT,
    status VARCHAR(30) DEFAULT 'waiting', -- 'waiting', 'in_consultation', 'completed'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. OPD Live Queue Table
CREATE TABLE IF NOT EXISTS docsee_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES docsee_patients(id) ON DELETE CASCADE,
    case_id UUID REFERENCES docsee_cases(id) ON DELETE CASCADE,
    token_number VARCHAR(20) NOT NULL,
    patient_name VARCHAR(150) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    chief_complaint VARCHAR(100) NOT NULL,
    priority_level VARCHAR(20) DEFAULT 'Standard',
    status VARCHAR(30) DEFAULT 'waiting', -- 'waiting', 'called', 'with_doctor', 'done'
    estimated_wait_min INT DEFAULT 15,
    assigned_doctor VARCHAR(100) DEFAULT 'Dr. Priya Sharma',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable Row Level Security (RLS) & Public Read/Write Policies for Hackathon Demo
ALTER TABLE docsee_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE docsee_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE docsee_queue ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read & write for kiosk & doctor client
CREATE POLICY "Allow public read on docsee_patients" ON docsee_patients FOR SELECT USING (true);
CREATE POLICY "Allow public insert on docsee_patients" ON docsee_patients FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on docsee_cases" ON docsee_cases FOR SELECT USING (true);
CREATE POLICY "Allow public insert on docsee_cases" ON docsee_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on docsee_cases" ON docsee_cases FOR UPDATE USING (true);

CREATE POLICY "Allow public read on docsee_queue" ON docsee_queue FOR SELECT USING (true);
CREATE POLICY "Allow public insert on docsee_queue" ON docsee_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on docsee_queue" ON docsee_queue FOR UPDATE USING (true);

-- 6. Sample Initial Seed Data
INSERT INTO docsee_patients (token_number, full_name, age, gender, phone, abha_id, department, language)
VALUES 
('1', 'Meena Kumari', 58, 'Female', '9876543210', '91-4829-1029-4401', 'General Medicine', 'hi'),
('2', 'Ravi Shankar', 42, 'Male', '9812345678', '91-5512-8821-9920', 'Ayurveda OPD', 'hi'),
('3', 'Sunita Devi', 62, 'Female', '9723456789', '91-3310-4491-1123', 'General Medicine', 'hi');

INSERT INTO docsee_cases (patient_id, token_number, chief_complaint, symptoms_narrative, bp_systolic, bp_diastolic, heart_rate, temperature_f, spo2_percent, priority_level, clinical_summary)
SELECT id, '1', 'Chest discomfort + breathlessness', 'Chest tightness on exertion for 2 hours, radiates to left shoulder. Sweating present.', 148, 92, 88, 98.4, 97, 'Priority', 'Patient presents with acute sub-sternal chest discomfort radiating to left upper arm. Vitals show mild hypertension with tachycardia.'
FROM docsee_patients WHERE token_number = '1';

INSERT INTO docsee_queue (patient_id, token_number, patient_name, age, gender, department, chief_complaint, priority_level, status, estimated_wait_min)
SELECT id, '1', 'Meena Kumari', 58, 'Female', 'General Medicine', 'Chest discomfort + breathlessness', 'Priority', 'waiting', 5
FROM docsee_patients WHERE token_number = '1';
