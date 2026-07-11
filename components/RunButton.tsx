type Props = {
  onClick?: () => void;
};

export default function RunButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "20px",
        borderRadius: 18,
        fontSize: 24,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      ▶ Run AIOS
    </button>
  );
}