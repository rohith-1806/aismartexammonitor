export default function WarningPopup({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="fixed top-6 right-6 z-50 bg-red-600 text-white px-6 py-4 rounded-xl shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold">
          Warning: {message}
        </span>

        <button
          onClick={onClose}
          className="bg-white text-red-600 px-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}