import React from "react";
import ApprenticeCard from "../components/apprenticeCard";
import img1 from '../assets/student1.png';
import img2 from '../assets/student2.png';
import img3 from '../assets/student3.png';

const mockApprentices = [
  {
    name: "דנה כהן",
    id: 1,
    gender: "נקבה",
    email: "dana.k@med-example.com",
    school_beginner_year: "2019",
    medical_level: "סטודנט שנה 3",
    Educational_institution: "אוניברסיטת תל אביב - הפקולטה לרפואה",
    profileImage: img1
  },

  {
    name: "יותם לוי",
    id: 2,
    gender: "זכר",
    email: "yotam.lev@hospital-demo.co.il",
    school_beginner_year: "2015",
    medical_level: "סטאזר",
    Educational_institution: "האוניברסיטה העברית והדסה עין כרם",
    profileImage: img2
  },
  {
    name: "מיכל שמש",
    id: 3,
    gender: "נקבה",
    email: "michal.s@clinic-test.org",
    school_beginner_year: "20214",
    medical_level: "מתמחה בביורפואה",
    Educational_institution: "אוניברסיטת בן-גוריון בנגב",
    profileImage: img3
  }
];

export default function Apprentices() {
  return (
    <div className="page-wrapper" dir="rtl">
       <h1 className="main-title">מתלמדים</h1>
        <div className="cards-grid">
        {mockApprentices.slice(0, 20).map((m)=> (
          <ApprenticeCard key={m.id} apprentice={m} />
        ))}
      </div>
    </div>
  );
}