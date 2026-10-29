import "./FloatingContact.css";

// const CONSULTANTS = [
//   {
//     id: "c-1",
//     name: "KTS. Hoàng Lan",
//     role: "Tư vấn Phòng khách & Sofa",
//     phone: "0974933486",
//     zaloUrl: "https://zalo.me/0974933486",
//     fbUrl: "https://m.me/nhaxinh",
//     avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
//   },
//   {
//     id: "c-2",
//     name: "KTS. Minh Quân",
//     role: "Tư vấn Phòng ngủ & Bếp",
//     phone: "0974933486",
//     zaloUrl: "https://zalo.me/0974933486",
//     fbUrl: "https://m.me/nhaxinh",
//     avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
//   },
//   {
//     id: "c-3",
//     name: "Thu Trang",
//     role: "CSKH & Báo giá dự án",
//     phone: "0974933486",
//     zaloUrl: "https://zalo.me/0974933486",
//     fbUrl: "https://m.me/nhaxinh",
//     avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
//   },
// ];

/**
 * Khối Chuyên viên tư vấn & Thanh đăng ký số điện thoại màu vàng
//  */
// export function ConsultantSection() {
//   const [phoneNumber, setPhoneNumber] = useState("");
//   const [submitted, setSubmitted] = useState(false);

//   const handleSubmitLead = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!phoneNumber.trim()) return;
//     setSubmitted(true);
//     setTimeout(() => {
//       alert(`Nhà Xinh đã nhận được số điện thoại: ${phoneNumber}. Chuyên viên tư vấn sẽ liên hệ lại với bạn trong vòng 5 phút!`);
//       setPhoneNumber("");
//       setSubmitted(false);
//     }, 300);
//   };

//   return (
//     <section className="nx-consultant-section">
//       <div className="nx-consultant-inner">
//         {/* Tiêu đề & Danh sách chuyên viên tư vấn */}
//         <div className="nx-consultant-head">
//           <h3>Đội ngũ chuyên viên tư vấn trực tiếp</h3>
//           <p>Nhấn vào Zalo hoặc Facebook để mở ứng dụng và trò chuyện trực tiếp 1-1 với tư vấn viên</p>
//         </div>

//         <div className="nx-consultant-cards">
//           {CONSULTANTS.map((c) => (
//             <div key={c.id} className="nx-consultant-card">
//               <img src={c.avatar} alt={c.name} className="nx-consultant-avatar" />
//               <h4 className="nx-consultant-name">{c.name}</h4>
//               <p className="nx-consultant-role">{c.role}</p>
//               <div className="nx-consultant-actions">
//                 <a
//                   href={c.zaloUrl}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="btn-contact-zalo"
//                   title="Nhấn để mở Zalo chat với tư vấn viên"
//                 >
//                   Zalo
//                 </a>
//                 <a
//                   href={c.fbUrl}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="btn-contact-fb"
//                   title="Nhấn để mở Messenger chat"
//                 >
//                   Facebook
//                 </a>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* ── Thanh Vàng Nhận Tư Vấn ── */}
//         <div className="nx-gold-lead-bar">
//           <div className="nx-gold-lead-title">
//             <div className="nx-gold-phone-circle">
//               <Phone size={22} />
//             </div>
//             <span>Để lại số điện thoại để được tư vấn miễn phí!</span>
//           </div>

//           <form className="nx-gold-lead-form" onSubmit={handleSubmitLead}>
//             <input
//               type="tel"
//               placeholder="Nhập số điện thoại của bạn tại đây..."
//               value={phoneNumber}
//               onChange={(e) => setPhoneNumber(e.target.value)}
//               className="nx-gold-lead-input"
//               required
//             />
//             <button type="submit" className="nx-gold-lead-btn" disabled={submitted}>
//               {submitted ? "Đang gửi..." : "TƯ VẤN NGAY"}
//             </button>
//           </form>
//         </div>
//       </div>
//     </section>
//   );
// }

/**
 * FloatingContact đã được tích hợp tập trung vào ChatWidget để tránh bị chồng đè vị trí
 * và đảm bảo luôn hiển thị đồng bộ trên mọi trang của website Nhà Xinh.
 */
export default function FloatingContact() {
  return null;
}

