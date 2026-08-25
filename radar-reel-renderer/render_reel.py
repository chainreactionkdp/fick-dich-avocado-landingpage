#!/usr/bin/env python3
import os, json, base64, math, wave, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W,H,FPS=1080,1920,30
JOB=json.loads(base64.b64decode(os.environ["JOB_B64"]).decode("utf-8"))
OUT=Path("build"); OUT.mkdir(exist_ok=True)

FONT_CAND=[
 "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf",
 "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"
]
FONT=next(p for p in FONT_CAND if os.path.exists(p))

def hexrgb(v,default):
    try:
        v=str(v).lstrip('#'); return tuple(int(v[i:i+2],16) for i in (0,2,4))
    except: return default
P=JOB.get("palette",{})
BG=hexrgb(P.get("background"),(5,22,30)); ACC=hexrgb(P.get("accent"),(245,190,28)); TXT=hexrgb(P.get("text"),(246,246,242))
SCENES=JOB["scenes"]
DUR=max(2.2,min(3.8,float(JOB.get("duration_per_scene",2.7))))

def F(sz): return ImageFont.truetype(FONT,sz)
def fit(draw,text,maxw=870,maxsize=205,minsize=54):
    for s in range(maxsize,minsize-1,-2):
        f=F(s); b=draw.textbbox((0,0),text,font=f,stroke_width=2)
        if b[2]-b[0] <= maxw: return f
    return F(minsize)

def bg(idx):
    small=Image.new("RGB",(180,320),BG); d=ImageDraw.Draw(small)
    for y in range(320):
        t=y/319
        k=.45+.55*(1-abs(t-.55)*1.5)
        c=tuple(max(0,min(255,int(x*k))) for x in BG)
        d.line((0,y,180,y),fill=c)
    im=small.resize((W,H),Image.Resampling.BICUBIC).convert("RGBA")
    fog=Image.new("RGBA",(W,H),(0,0,0,0)); fd=ImageDraw.Draw(fog,"RGBA")
    for j in range(7):
        x=-180+((idx*173+j*251)%1200); y=520+((idx*137+j*199)%850)
        fd.ellipse((x,y,x+520,y+135),fill=(*TXT,8+j%3*3))
    fd.ellipse((590,770,1010,1190),fill=(*ACC,24))
    fog=fog.filter(ImageFilter.GaussianBlur(70))
    return Image.alpha_composite(im,fog)

def card(idx,scene):
    im=bg(idx); d=ImageDraw.Draw(im,"RGBA")
    lines=[str(x).strip() for x in scene.get("lines",[]) if str(x).strip()]
    accent_line=int(scene.get("accent_line",len(lines)-1))
    fs=[]; hs=[]
    for line in lines:
        f=fit(d,line); b=d.textbbox((0,0),line,font=f,stroke_width=2); fs.append(f); hs.append(b[3]-b[1])
    gap=30; total=sum(hs)+gap*max(0,len(lines)-1); y=(H-total)//2
    for n,(line,f,h) in enumerate(zip(lines,fs,hs)):
        b=d.textbbox((0,0),line,font=f,stroke_width=2); x=(W-(b[2]-b[0]))//2
        col=ACC if n==accent_line else TXT
        d.text((x+6,y+8),line,font=f,fill=(0,0,0,150),stroke_width=3,stroke_fill=(0,0,0,110))
        d.text((x,y),line,font=f,fill=col,stroke_width=2,stroke_fill=(0,0,0,100)); y+=h+gap
    p=OUT/f"scene_{idx:02d}.jpg"; im.convert("RGB").save(p,quality=92); return p

cards=[card(i+1,s) for i,s in enumerate(SCENES)]
clips=[]
for i,p in enumerate(cards):
    cp=OUT/f"clip_{i:02d}.mp4"
    vf="scale=1120:1991,zoompan=z='min(zoom+0.00018,1.032)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,format=yuv420p"
    subprocess.run(["ffmpeg","-y","-loglevel","error","-loop","1","-i",str(p),"-t",str(DUR),"-vf",vf,"-an","-c:v","libx264","-preset","veryfast","-crf","24",str(cp)],check=True)
    clips.append(cp)

lst=OUT/"list.txt"; lst.write_text("".join(f"file '{c.resolve()}'\n" for c in clips))
visual=OUT/"visual.mp4"
subprocess.run(["ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",str(lst),"-c","copy",str(visual)],check=True)

total=DUR*len(SCENES); sr=44100; wav=OUT/"sound.wav"
with wave.open(str(wav),"wb") as wf:
    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr)
    frames=[]
    for n in range(int(total*sr)):
        t=n/sr
        v=.010*math.sin(2*math.pi*42*t)+.004*math.sin(2*math.pi*84*t)
        phase=t%DUR
        if phase<.35: v += .16*math.sin(2*math.pi*65*phase)*math.exp(-10*phase)
        v=max(-.85,min(.85,v)); frames.append(int(v*32767).to_bytes(2,'little',signed=True))
    wf.writeframes(b''.join(frames))

final=OUT/"reel.mp4"
subprocess.run(["ffmpeg","-y","-loglevel","error","-i",str(visual),"-i",str(wav),"-c:v","copy","-c:a","aac","-b:a","128k","-shortest","-movflags","+faststart",str(final)],check=True)
print(final)
