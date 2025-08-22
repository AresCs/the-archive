export default function Spinner() {
  return (
    <div style={{display:'grid',placeItems:'center',minHeight:'40vh'}} aria-busy="true" aria-live="polite">
      <div style={{width:40,height:40,border:'4px solid #999',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
