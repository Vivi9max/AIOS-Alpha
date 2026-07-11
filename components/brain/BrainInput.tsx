interface Props {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onRun: () => void;
}

export default function BrainInput({
  value,
  loading,
  onChange,
  onRun,
}: Props) {
  return (
    <>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="请输入任务..."
        style={{
          width: "100%",
          minHeight: 180,
          padding: 16,
          marginTop: 20,
          fontSize: 16,
        }}
      />

      <button
        onClick={onRun}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: "12px 28px",
        }}
      >
        {loading ? "Running..." : "Execute"}
      </button>
    </>
  );
}