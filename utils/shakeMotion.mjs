/** Selisih percepatan antarsampel (dalam satuan g), bukan besar gravitasi absolut. */
export function getMotionDelta(previous,current){
 if (!previous || !current) return 0;
 const values=[previous.x,previous.y,previous.z,current.x,current.y,current.z];
 if (!values.every(Number.isFinite)) return 0;
 return Math.hypot(current.x-previous.x,current.y-previous.y,current.z-previous.z);
}

export function isShake(previous,current,threshold=0.85){
 return Number.isFinite(threshold) && threshold>0 && getMotionDelta(previous,current)>=threshold;
}
