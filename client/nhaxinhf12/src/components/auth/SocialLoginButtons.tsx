// import type { AuthTab } from "./types";

// interface SocialLoginButtonsProps {
//   activeTab: AuthTab;
//   onSocialClick: (provider: "Google" | "Facebook") => void;
// }

// export default function SocialLoginButtons({
//   activeTab,
//   onSocialClick,
// }: SocialLoginButtonsProps) {
//   if (activeTab === "forgot") return null;

//   return (
//     <>
//       {/* Dòng phân cách "hoặc" */}
//       <div className="relative my-5 flex items-center justify-center">
//         <div className="w-full border-t border-[#E7E2DA]" />
//         <span className="absolute bg-white px-3 text-xs text-[#A8A29E]">
//           hoặc
//         </span>
//       </div>

//       {/* 2 nút Đăng nhập qua Google & Facebook */}
//       <div className="grid grid-cols-2 gap-3">
//         <button
//           type="button"
//           onClick={() => onSocialClick("Google")}
//           className="w-full py-2.5 px-3 border border-[#D8D2C9] bg-white hover:bg-[#FAF8F5] active:bg-[#F2EDE6] rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-[#3A342E] transition-all cursor-pointer shadow-2xs"
//         >
//           <svg width="18" height="18" viewBox="0 0 18 18">
//             <path
//               d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
//               fill="#4285F4"
//             />
//             <path
//               d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
//               fill="#34A853"
//             />
//             <path
//               d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
//               fill="#FBBC05"
//             />
//             <path
//               d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
//               fill="#EA4335"
//             />
//           </svg>
//           <span className="truncate">
//             {activeTab === "login" ? "Đăng nhập bằng Google" : "Đăng ký bằng Google"}
//           </span>
//         </button>

//         <button
//           type="button"
//           onClick={() => onSocialClick("Facebook")}
//           className="w-full py-2.5 px-3 border border-[#D8D2C9] bg-white hover:bg-[#FAF8F5] active:bg-[#F2EDE6] rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-[#3A342E] transition-all cursor-pointer shadow-2xs"
//         >
//           <svg width="18" height="18" viewBox="0 0 18 18">
//             <path
//               d="M18 9a9 9 0 10-10.406 8.89v-6.29H5.309V9h2.285V7.017c0-2.255 1.343-3.501 3.4-3.501.984 0 2.014.176 2.014.176v2.215h-1.135c-1.118 0-1.467.694-1.467 1.406V9h2.496l-.399 2.6h-2.097v6.29A9.003 9.003 0 0018 9z"
//               fill="#1877F2"
//             />
//           </svg>
//           <span className="truncate">
//             {activeTab === "login" ? "Đăng nhập bằng Facebook" : "Đăng ký bằng Facebook"}
//           </span>
//         </button>
//       </div>
//     </>
//   );
// }
