interface Props {
  answer: string;
}

export default function BrainResult({
  answer,
}: Props) {
  return (
    <pre
      style={{
        marginTop: 30,
        background: "#f5f5f5",
        padding: 20,
        borderRadius: 12,
        whiteSpace: "pre-wrap",
      }}
    >
      {answer}
    </pre>
  );
}