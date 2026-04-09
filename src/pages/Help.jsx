import { useState } from "react";
import { Link } from "react-router-dom";

const Help = () => {
  const [isBangla, setIsBangla] = useState(false);

  const guideSteps = [
    {
      title: isBangla ? "লেভেল আপ এবং এক্সপি (XP)" : "Leveling & XP",
      icon: "bi-lightning-charge-fill",
      color: "text-warning",
      desc: isBangla 
        ? "প্রতিটি কাজ সম্পন্ন করলে আপনি এক্সপি অর্জন করবেন। যথেষ্ট এক্সপি হলে আপনার লেভেল বাড়বে।"
        : "Earn XP by completing tasks. Accumulate enough XP to increase your overall Level."
    },
    {
      title: isBangla ? "রুটিন কোয়েস্ট" : "Routine Quests",
      icon: "bi-calendar-check",
      color: "text-primary",
      desc: isBangla
        ? "আপনার দৈনন্দিন কাজগুলোকে সকাল, দুপুর ও রাত - এই ৩টি ভাগে ভাগ করে সাজান।"
        : "Organize your daily habits into Morning, Afternoon, and Night phases."
    },
    {
      title: isBangla ? "অ্যাট্রিবিউট বা গুণাবলী" : "Attribute Mastery",
      icon: "bi-gem",
      color: "text-info",
      desc: isBangla
        ? "৪টি মূল গুণাবলী: STR (শক্তি), INT (বুদ্ধি), SPR (মন), CHA (ব্যক্তিত্ব) উন্নত করুন।"
        : "Master 4 core attributes: STR (Strength), INT (Intelligence), SPR (Spirit), and CHA (Charisma)."
    },
    {
      title: isBangla ? "ই-বুক ডায়েরি" : "Ebook Journal",
      icon: "bi-book",
      color: "text-success",
      desc: isBangla
        ? "আপনার স্মৃতিগুলো লিখে রাখুন এবং পরে সেগুলো একটি সুন্দর ই-বুক হিসেবে পড়ুন।"
        : "Write your reflections and read them back in a beautiful Ebook format."
    }
  ];

  return (
    <div className="container py-4 mb-5" style={{ fontFamily: isBangla ? "'Hind Siliguri', sans-serif" : "inherit" }}>
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <h2 className="fw-bold m-0">{isBangla ? "সাহায্য ও সহযোগিতা" : "Help & Support"}</h2>
        <button 
          className={`btn btn-sm rounded-pill px-3 fw-bold ${isBangla ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setIsBangla(!isBangla)}
        >
          {isBangla ? "English" : "বাংলা"}
        </button>
      </div>

      {/* Basic Guide */}
      <section className="mb-5">
        <h5 className="fw-bold mb-3 text-muted text-uppercase small letter-spacing-1">
          {isBangla ? "গাইড বুক" : "Quest Manual"}
        </h5>
        <div className="row g-3">
          {guideSteps.map((step, i) => (
            <div key={i} className="col-12 col-md-6">
              <div className="card border-0 shadow-sm rounded-4 h-100 p-3">
                <div className="d-flex align-items-start gap-3">
                  <div className={`fs-2 ${step.color}`}>
                    <i className={`bi ${step.icon}`}></i>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1">{step.title}</h6>
                    <p className="small text-muted mb-0">{step.desc}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Advanced Import Guide */}
      <section className="mb-5">
        <h5 className="fw-bold mb-3 text-muted text-uppercase small letter-spacing-1">
          {isBangla ? "অ্যাডভান্সড ইমপোর্ট গাইড" : "Advanced Import Guide"}
        </h5>
        
        {/* Bulk Text */}
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
          <h6 className="fw-bold mb-3 text-primary"><i className="bi bi-fonts me-2"></i>{isBangla ? "বাল্ক টেক্সট ফরমেট" : "Bulk Text Format"}</h6>
          <p className="small text-muted mb-3">
            {isBangla 
              ? "রুটিন পেজে ইমপোর্ট মোডালে নিচের মতো করে প্রতি লাইনে একটি করে কাজ লিখুন:" 
              : "In the Routine page Import modal, write one task per line exactly like this:"}
          </p>
          <div className="bg-dark text-warning p-3 rounded-3 mb-3" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
            07:30 - Morning Yoga (STR)<br />
            09:00 - Coding Java (INT)<br />
            18:00 - Meditation (SPR)<br />
            20:00 - Call Friend (CHA)
          </div>
          <div className="small bg-info bg-opacity-10 p-2 rounded-3 border-start border-info border-3">
            <i className="bi bi-info-circle-fill me-2 text-info"></i>
            {isBangla ? "অ্যাট্রিবিউট অবশ্যই STR, INT, SPR অথবা CHA হতে হবে।" : "Attributes must be STR, INT, SPR, or CHA."}
          </div>
        </div>

        {/* File Import Detailed */}
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white border-top border-success border-4">
          <h6 className="fw-bold mb-3 text-success"><i className="bi bi-file-earmark-spreadsheet me-2"></i>{isBangla ? "ফাইল ইমপোর্ট ফরমেট" : "File Import Formats"}</h6>
          
          {/* CSV Example */}
          <div className="mb-4">
            <p className="small fw-bold mb-2 text-muted uppercase">1. CSV (Excel) Format:</p>
            <p className="small text-muted mb-2">{isBangla ? "এক্সেল ফাইলের প্রথম লাইনে নিচের নামগুলো হেডার হিসেবে থাকতে হবে:" : "The first row of your Excel/CSV must have these headers:"}</p>
            <div className="table-responsive">
              <table className="table table-sm table-bordered small text-center bg-light">
                <thead className="table-dark">
                  <tr>
                    <th>title</th>
                    <th>taskTime</th>
                    <th>statType</th>
                    <th>difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Gym</td>
                    <td>07:00</td>
                    <td>str</td>
                    <td>hard</td>
                  </tr>
                  <tr>
                    <td>Read</td>
                    <td>21:00</td>
                    <td>int</td>
                    <td>medium</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* JSON Example */}
          <div className="mb-0">
            <p className="small fw-bold mb-2 text-muted uppercase">2. JSON Format:</p>
            <p className="small text-muted mb-2">{isBangla ? "জেসন ফাইলের ফরমেট নিচের মতো হতে হবে:" : "Your JSON file should look like this array of objects:"}</p>
            <div className="bg-dark text-info p-3 rounded-3" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
{`[
  {
    "title": "Evening Walk",
    "taskTime": "17:30",
    "statType": "str",
    "difficulty": "easy"
  }
]`}
            </div>
          </div>
        </div>
      </section>

      {/* Attribute Deep Dive */}
      <section className="mb-5">
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-dark text-white">
          <h5 className="fw-bold mb-4">
            <i className="bi bi-award me-2 text-warning"></i>
            {isBangla ? "অ্যাট্রিবিউট গাইড" : "Attribute Deep Dive"}
          </h5>
          <div className="d-flex flex-column gap-3">
            <div className="border-start border-danger border-3 ps-3">
              <strong className="text-danger">STR (Strength):</strong>
              <p className="small opacity-75 mb-0">{isBangla ? "শারীরিক পরিশ্রম, ব্যায়াম বা খেলাধুলার জন্য।" : "Physical activities, gym, sports, or manual labor."}</p>
            </div>
            <div className="border-start border-info border-3 ps-3">
              <strong className="text-info">INT (Intelligence):</strong>
              <p className="small opacity-75 mb-0">{isBangla ? "পড়াশোনা, কোডিং, নতুন কিছু শেখা বা স্কিল অর্জন।" : "Studying, coding, learning new skills, or problem solving."}</p>
            </div>
            <div className="border-start border-success border-3 ps-3">
              <strong className="text-success">SPR (Spirit):</strong>
              <p className="small opacity-75 mb-0">{isBangla ? "ধ্যান, ডায়েরি লেখা, নামাজ/প্রার্থনা বা মানসিক প্রশান্তি।" : "Meditation, journaling, prayer, or mental well-being."}</p>
            </div>
            <div className="border-start border-warning border-3 ps-3">
              <strong className="text-warning">CHA (Charisma):</strong>
              <p className="small opacity-75 mb-0">{isBangla ? "সামাজিক যোগাযোগ, মানুষের সাথে কথা বলা বা পাবলিক স্পিকিং।" : "Socializing, networking, public speaking, or team work."}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="text-center py-4">
        <Link to="/" className="btn btn-primary rounded-pill px-5 fw-bold shadow-sm">
          {isBangla ? "যাত্রা শুরু করুন" : "Start Your Journey"}
        </Link>
      </div>
    </div>
  );
};

export default Help;
