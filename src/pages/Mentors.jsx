import React from "react";
import MentorCard from "../components/mentorsCard";
import image1 from '../assets/mentor1.jpg';
import image2 from '../assets/mentor2.jpg';
import image3 from '../assets/mentor3.jpg';

const mockMentors = [
  {
    name: "דנה כהן",
    id: 1,
    gender: "נקבה",
    email: "dana.k@med-example.com",
    specialty: "רפואת ילדים והתפתחות הילד",
    degrees: "דוקטור לרפואה (MD)",
    Educational_institution: "אוניברסיטת תל אביב - הפקולטה לרפואה",
    profileImage: image2
  },
  {
    name: "יותם לוי",
    id: 2,
    gender: "זכר",
    email: "yotam.lev@hospital-demo.co.il",
    specialty: "כירורגיה לב-חזה וצנתורים",
    degrees: "דוקטור לרפואה (MD) ו-PhD בפיזיולוגיה",
    Educational_institution: "האוניברסיטה העברית והדסה עין כרם",
    profileImage: image1
  },
  {
    name: "מיכאל לוי",
    id: 3,
    gender: "זכר",
    email: "michael.s@clinic-test.org",
    specialty: "נוירולוגיה קלינית",
    degrees: "דוקטור לרפואה (MD) בהצטיינות יתרה",
    Educational_institution: "אוניברסיטת בן-גוריון בנגב",
    profileImage: image3
  },
];



export default function Mentors() {
  return (
    <div className="page-wrapper" dir="rtl">
     <h1 className="main-title">מנחים</h1>
      <div className="cards-grid">
        {mockMentors.slice(0, 20).map((m) => (
          <MentorCard key={m.id} mentor={m} />
        ))}
      </div>
    </div>
  );
}