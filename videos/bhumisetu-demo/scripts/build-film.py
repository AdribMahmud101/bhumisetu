"""Build the deterministic HyperFrames composition and disjoint Bangla caption rail."""
from pathlib import Path
import json, html, re

project=Path(__file__).resolve().parents[1]
repo=project.parents[1]
scenes=[
 dict(id='hook',start=0,end=7,title='নথির অমিল, জীবনের অনিশ্চয়তা',voice_start=.7,voice_end=6.1,text='জমি কেনা মানে একটি পরিবারের সঞ্চয়। কাগজে অমিল থাকলে, ঝুঁকিতে পড়ে ভবিষ্যৎ।'),
 dict(id='overview',start=7,end=15,title='চারটি কাজ। একটি সংযুক্ত অভিজ্ঞতা।',voice_start=7.7,voice_end=14.1,text='ভূমিসেতু—নথি ডিজিটাইজেশন, দলিল যাচাই, একাধিক বিক্রির সতর্কতা এবং নাগরিকের তথ্যভিত্তিক সিদ্ধান্ত।'),
 dict(id='ocr',start=15,end=33,title='মূল নথি থেকে সম্পাদনাযোগ্য তথ্য',voice_start=16,voice_end=31.3,text='কর্মকর্তা মূল নথি আপলোড করেন। এআই দাগ, খতিয়ান, নাম ও জমির পরিমাণ শনাক্ত করে। ফলাফল মূল নথির সঙ্গে মিলিয়ে সম্পাদনা করা যায়।'),
 dict(id='audit',start=33,end=43,title='সংশোধন হয়। ইতিহাসও থাকে।',voice_start=33.8,voice_end=42.1,text='প্রতিটি সংশোধনে থাকে আগের তথ্য, নতুন তথ্য ও কারণ। কোন কর্মকর্তা কী বদলালেন, অডিট ইতিহাসে দেখা যায়।'),
 dict(id='conflict',start=43,end=57,title='একই জমি, একাধিক দাবির সতর্কতা',voice_start=43.8,voice_end=55.8,text='এখানে বিশ শতকের জমিতে দুটি দলিলে দাবি চব্বিশ শতক। ভূমিসেতু সংশ্লিষ্ট দলিল এবং নামজারির অমিল সামনে আনে। সতর্কতার কারণও দেখা যায়।'),
 dict(id='deed',start=57,end=70,title='দলিল বদলালে, অমিল সামনে আসে',voice_start=57.7,voice_end=68.8,text='আপনার দলিল আপলোড করে সংরক্ষিত তথ্যের সঙ্গে মিলিয়ে দেখুন। জমির পরিমাণ, দাগ কিংবা নাম বদলালে, পার্থক্যটি আলাদা করে দেখা যায়।'),
 dict(id='citizen',start=70,end=83,title='কেনার আগে, নিজের চোখে যাচাই',voice_start=70.8,voice_end=81.7,text='নাগরিক জমির আইডি বা কিউআর দিয়ে রেকর্ড খুঁজে পান। একই প্রতিবেদনে ইতিহাস ও সতর্কতা দেখেন। প্রয়োজনে প্রতিবেদন প্রিন্ট বা কিউআর সংরক্ষণ করেন।'),
 dict(id='closing',start=83,end=90,title='ভূমিসেতু',voice_start=83.6,voice_end=88.8,text='ভূমিসেতু। এআই পড়ে, নিয়ম অমিল দেখায়, মানুষ সিদ্ধান্ত নেয়।'),
]
captions=[
 (.7,3.4,'জমি কেনা মানে একটি পরিবারের সঞ্চয়।'),(3.55,6.1,'কাগজে অমিল থাকলে, ঝুঁকিতে পড়ে ভবিষ্যৎ।'),
 (7.7,10.7,'ভূমিসেতু—নথি ডিজিটাইজেশন, দলিল যাচাই,'),(10.85,14.1,'একাধিক বিক্রির সতর্কতা এবং নাগরিকের তথ্যভিত্তিক সিদ্ধান্ত।'),
 (16,19.5,'কর্মকর্তা মূল নথি আপলোড করেন।'),(19.65,25.2,'এআই দাগ, খতিয়ান, নাম ও জমির পরিমাণ শনাক্ত করে।'),(25.4,31.3,'ফলাফল মূল নথির সঙ্গে মিলিয়ে সম্পাদনা করা যায়।'),
 (33.8,38,'প্রতিটি সংশোধনে থাকে আগের তথ্য, নতুন তথ্য ও কারণ।'),(38.2,42.1,'কোন কর্মকর্তা কী বদলালেন, অডিট ইতিহাসে দেখা যায়।'),
 (43.8,48.9,'এখানে বিশ শতকের জমিতে দুটি দলিলে দাবি চব্বিশ শতক।'),(49.05,53.4,'ভূমিসেতু সংশ্লিষ্ট দলিল এবং নামজারির অমিল সামনে আনে।'),(53.6,55.8,'সতর্কতার কারণও দেখা যায়।'),
 (57.7,62.4,'আপনার দলিল আপলোড করে সংরক্ষিত তথ্যের সঙ্গে মিলিয়ে দেখুন।'),(62.6,68.8,'জমির পরিমাণ, দাগ কিংবা নাম বদলালে, পার্থক্যটি আলাদা করে দেখা যায়।'),
 (70.8,75.3,'নাগরিক জমির আইডি বা কিউআর দিয়ে রেকর্ড খুঁজে পান।'),(75.45,78.2,'একই প্রতিবেদনে ইতিহাস ও সতর্কতা দেখেন।'),(78.4,81.7,'প্রয়োজনে প্রতিবেদন প্রিন্ট বা কিউআর সংরক্ষণ করেন।'),
 (83.6,85,'ভূমিসেতু।'),(85.15,88.8,'এআই পড়ে, নিয়ম অমিল দেখায়, মানুষ সিদ্ধান্ত নেয়।'),
]
for a,b in zip(captions,captions[1:]):assert a[1] < b[0]
for c in captions:
 assert c[1]>c[0]
 assert any(s['voice_start']<=c[0] and c[1]<=s['voice_end'] for s in scenes)

def tc(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
(project/'captions.bn.srt').write_text('\n\n'.join(f'{i+1}\n{tc(a)} --> {tc(b)}\n{text}' for i,(a,b,text) in enumerate(captions))+'\n')
(project/'TIMING.json').write_text(json.dumps({'duration':90,'fps':30,'width':1920,'height':1080,'audio':True,'scenes':scenes,'captions':[dict(start=a,end=b,text=t) for a,b,t in captions]},ensure_ascii=False,indent=2))
script=['# BhumiSetu — Bangla narration master','', '**Voice:** Soniox Priya, Bengali (`bn`), generated as eight separate takes; the original muted version is also retained.','**Voice direction:** Warm, clear Bangladeshi Bangla; composed, evidence-led delivery. Each line is generated separately in its allocated window.','', 'Speech windows include safety gaps. The recorded durations and actual placements are verified in `VOICE_TIMING.json`; no adjacent scenes overlap.','']
board=['---','format: 1920x1080','duration: 90s','message: "নথি থেকে তথ্যভিত্তিক ভূমি যাচাই"','arc: "Human stakes → connected product → live OCR → audit → conflict → deed comparison → citizen → close"','audience: LandTech 2026 judges','mode: autonomous','---','']
asset_map={'hook':'assets/source-khatian.jpg; assets/homepage.png','overview':'assets/homepage.png; assets/workspace.png','ocr':'assets/ocr-live.mp4; assets/ocr-fields.png; assets/source-khatian.jpg','audit':'assets/review-fields.png; assets/audit-detail.png','conflict':'assets/area-conflict.png; assets/evidence-detail.png','deed':'assets/deed-live.mp4; assets/deed-key-fields.png','citizen':'assets/citizen-live.mp4; assets/record-qr.png; assets/printed-dossier.png','closing':'captured landmark brand mark; live URL'}
for i,s in enumerate(scenes):
 script += [f'## Line {i+1} — {s["title"]} (Frame {i+1})','',f'**Picture:** {s["start"]:.1f}–{s["end"]:.1f}s',f'**Speech:** {s["voice_start"]:.1f}–{s["voice_end"]:.1f}s; maximum {s["voice_end"]-s["voice_start"]:.1f}s','**Delivery:** Finish comfortably before the end; keep the transition silent.','',f'    {s["text"]}','']
 board += [f'## Frame {i+1} — {s["title"]}','',f'- status: animated',f'- duration: {s["end"]-s["start"]}s','- transition_in: fluid settle / focus handoff',f'- scene: {s["title"]}',f'- voiceover: {s["text"]}',f'- asset_candidates: {asset_map[s["id"]]}',f'- src: index.html#{s["id"]}',f'- poster: {min(3,(s["end"]-s["start"])/2)}s','', 'Actual app captures stay unchanged. Use one camera wrapper, restrained long-tail easing and a stable reading hold.','']
(project/'SCRIPT.md').write_text('\n'.join(script))
(project/'STORYBOARD.md').write_text('\n'.join(board))

logo=(project/'capture/assets/svgs/logo-4a81d340.svg').read_text()
logo=re.sub(r'width="24" height="24"','width="42" height="42"',logo)

content='''
<section id="hook" class="scene clip" data-start="0" data-duration="7" data-track-index="1">
  <div id="hook-copy" class="hero-copy"><p class="eyebrow">নথির ওপাশে একটি পরিবারের ভবিষ্যৎ</p><h1>জমির কাগজে অমিল?</h1><h1 class="green">সিদ্ধান্তের আগে জানুন।</h1><p class="hero-note">নথি। প্রমাণ। মানুষের সিদ্ধান্ত।</p></div>
  <div id="paper-one" class="paper"><img src="assets/source-khatian.jpg" alt="কাল্পনিক খতিয়ানের মূল নমুনা"></div>
  <div id="paper-two" class="paper"><img src="assets/printed-dossier.png" alt="প্রোটোটাইপ থেকে প্রিন্ট করা প্রতিবেদন"></div>
  <div id="paper-label" class="tiny-tag">নমুনা নথি</div>
</section>
<section id="overview" class="scene clip" data-start="7" data-duration="8" data-track-index="1">
  <h2 class="scene-title">চারটি কাজ। একটি সংযুক্ত অভিজ্ঞতা।</h2>
  <div class="capabilities"><div id="cap-one" class="capability"><span>P1</span><div>পুরোনো নথি ডিজিটাইজেশন</div></div><div id="cap-two" class="capability"><span>P2</span><div>দলিলের তথ্য যাচাই</div></div><div id="cap-three" class="capability"><span>P3</span><div>দ্বৈত বিক্রয়ের সতর্কতা</div></div><div id="cap-four" class="capability"><span>P5</span><div>কেনার আগে নাগরিক যাচাই</div></div></div>
  <div id="overview-browser" class="browser overview-browser"><div class="chrome"><i></i><i></i><i></i><span>ব্রাউজারেই ভূমিসেতু</span></div><div class="screen"><img id="overview-world" src="assets/homepage.png" alt="ভূমিসেতুর আসল হোমপেজ"></div></div>
</section>
<section id="ocr" class="scene clip" data-start="15" data-duration="18" data-track-index="1">
  <h2 class="scene-title">মূল নথি থেকে সম্পাদনাযোগ্য তথ্য</h2><span class="feature-tag">P1 · বাস্তব আপলোড ও এআই প্রতিক্রিয়া</span>
  <div id="ocr-source" class="source-paper"><span class="source-label">মূল নমুনা খতিয়ান</span><img src="assets/source-khatian.jpg" alt="ওসিআরে ব্যবহৃত একই মূল নমুনা"></div>
  <div class="browser ocr-shell"><div class="chrome"><i></i><i></i><i></i><span>মূল নথি অক্ষুণ্ণ · ফলাফল কর্মকর্তার সম্পাদনাযোগ্য</span></div></div>
  <div id="ocr-confirmed" class="confirmed-fields"><div class="confirmation-label">মূল নথি মিলিয়ে কর্মকর্তার সম্পাদনা</div><img src="assets/ocr-fields.png" alt="আসল ফর্মে কর্মকর্তার সংশোধিত ১০৫ নম্বর ও ১৫ শতক"></div>
  <div id="ocr-wait-label" class="wait-label">অপেক্ষার অংশ দ্রুত দেখানো হয়েছে</div>
</section>
<section id="audit" class="scene clip" data-start="33" data-duration="10" data-track-index="1">
  <h2 class="scene-title">সংশোধন হয়। ইতিহাসও থাকে।</h2><span class="feature-tag">কর্মকর্তার পর্যালোচনা ও অডিট</span>
  <div id="audit-editor" class="browser audit-editor"><div class="chrome"><i></i><i></i><i></i><span>মূল দলিলের সঙ্গে তথ্য পর্যালোচনা</span></div><div class="screen"><img src="assets/review-fields.png" alt="আসল দলিলের সম্পাদনাযোগ্য পর্যালোচনা ক্ষেত্র"></div></div>
  <div id="audit-words" class="audit-words"><p>আগের তথ্য</p><p class="green">নতুন তথ্য</p><p>কারণ ও সময়</p></div>
  <div id="audit-proof" class="audit-proof"><div class="proof-label">সংরক্ষিত সংশোধনের আসল অডিট এন্ট্রি</div><img src="assets/audit-detail.png" alt="দাগ নম্বরের আগের ও নতুন মানসহ আসল অডিট রেকর্ড"></div>
</section>
<section id="conflict" class="scene clip" data-start="43" data-duration="14" data-track-index="1">
  <h2 class="scene-title">একই জমি, একাধিক দাবির সতর্কতা</h2><span class="feature-tag">P3 · কারণ ও উৎস নথিসহ</span>
  <div id="area-proof" class="area-proof"><img src="assets/area-conflict.png" alt="আসল বিশ শতক বনাম চব্বিশ শতকের হিসাব"></div>
  <div id="evidence-proof" class="evidence-proof"><div class="proof-label">সতর্কতার পেছনে দলিল ও নামজারির প্রমাণ</div><div class="evidence-crop"><img id="evidence-world" src="assets/evidence-detail.png" alt="আসল নিয়মভিত্তিক সতর্কতা ও সংশ্লিষ্ট নথি"></div></div>
</section>
<section id="deed" class="scene clip" data-start="57" data-duration="13" data-track-index="1">
  <h2 class="scene-title">দলিল বদলালে, অমিল সামনে আসে</h2><span class="feature-tag">P2 · আপলোড → সম্পাদনা → মিলিয়ে দেখা</span>
  <div class="browser deed-shell"><div class="chrome"><i></i><i></i><i></i><span>আপলোড করা নমুনা দলিল যাচাই</span></div></div>
  <div id="deed-proof" class="deed-proof"><div class="proof-label">একই দলিল নম্বর · জমির পরিমাণে পার্থক্য</div><img src="assets/deed-key-fields.png" alt="আসল তুলনায় ১২ শতকের বিপরীতে আপলোডে ২৫ শতক"></div>
  <div id="deed-wait-label" class="wait-label">অপেক্ষার অংশ দ্রুত দেখানো হয়েছে</div>
</section>
<section id="citizen" class="scene clip" data-start="70" data-duration="13" data-track-index="1">
  <h2 class="scene-title">কেনার আগে, নিজের চোখে যাচাই</h2><span class="feature-tag">P5 · জমির আইডি অথবা কিউআর</span>
  <div class="browser citizen-shell"><div class="chrome"><i></i><i></i><i></i><span>প্রকাশিত রেকর্ড · ইতিহাস · সতর্কতা</span></div></div>
  <div id="qr-proof" class="qr-proof"><img src="assets/record-qr.png" alt="আসল প্রকাশিত রেকর্ডের রপ্তানি করা কিউআর"><p>আসল রেকর্ডের কিউআর</p></div>
  <div id="print-proof" class="print-proof"><img src="assets/printed-dossier.png" alt="অ্যাপ থেকে তৈরি আসল প্রিন্ট প্রতিবেদন"><p>প্রিন্টযোগ্য প্রতিবেদন</p></div>
</section>
<section id="closing" class="scene clip" data-start="83" data-duration="7" data-track-index="1">
<div id="close-ring-one" class="close-ring" data-layout-allow-overflow></div><div id="close-ring-two" class="close-ring second" data-layout-allow-overflow></div>
  <div class="close-content"><div id="closing-brand">ভূমিসেতু</div><p id="closing-claim">এআই পড়ে। নিয়ম অমিল দেখায়। মানুষ সিদ্ধান্ত নেয়।</p><div id="closing-caps">P1 <span>·</span> P2 <span>·</span> P3 <span>·</span> P5</div><p id="closing-url">bhumisetu.adribmahmud.workers.dev</p></div>
</section>
<div id="ocr-camera" class="video-camera ocr-camera"><video id="ocr-video" class="clip" src="assets/ocr-live.mp4" muted playsinline data-start="15" data-duration="18" data-track-index="2"></video></div>
<div id="deed-camera" class="video-camera deed-camera"><video id="deed-video" class="clip" src="assets/deed-live.mp4" muted playsinline data-start="57" data-duration="13" data-track-index="2"></video></div>
<div id="citizen-camera" class="video-camera citizen-camera"><video id="citizen-video" class="clip" src="assets/citizen-live.mp4" muted playsinline data-start="70" data-duration="13" data-track-index="2"></video></div>
<audio id="priya-narration" src="assets/priya-narration.wav" data-start="0" data-duration="90" data-track-index="4" data-audio-group="voiceover" preload="auto"></audio>
'''
caption_markup='\n'.join(f'<div id="caption-{i}" class="clip subtitle" data-start="{a}" data-duration="{b-a:.3f}" data-track-index="10">{html.escape(t)}</div>' for i,(a,b,t) in enumerate(captions))

css='''
@font-face{font-family:BanglaFilm;src:url('assets/Bengali-Regular.ttf');font-weight:400 600}
@font-face{font-family:BanglaFilm;src:url('assets/Bengali-Bold.ttf');font-weight:700 900}
@font-face{font-family:LatinFilm;src:url('assets/Latin-Regular.ttf');font-weight:400 600}
@font-face{font-family:LatinFilm;src:url('assets/Latin-Bold.ttf');font-weight:700 900}
*{box-sizing:border-box;margin:0;padding:0}html,body{width:1920px;height:1080px;overflow:hidden;background:#FFFFFF}
#root{position:relative;width:100%;height:100%;overflow:hidden;background:#FFFFFF;color:#1C342B;font-family:BanglaFilm,LatinFilm,sans-serif}
.scene{position:absolute;inset:0;overflow:hidden;background:#FFFFFF}
.global-header{position:absolute;z-index:80;left:0;top:0;width:1920px;height:92px;background:#FFFFFF;border-bottom:1px solid #dce8df;display:flex;align-items:center;justify-content:space-between;padding:0 76px}
.brand{display:flex;align-items:center;gap:16px;color:#086447;font-size:35px;font-weight:700}.header-note{font-size:21px;color:#084B37}.header-note span{display:inline-block;margin-left:24px;border-left:1px solid #b8cdbf;padding-left:24px}
.green{color:#086447}.eyebrow{font-size:24px;font-weight:700;color:#086447;margin-bottom:26px}.hero-copy{position:absolute;left:105px;top:278px;width:1040px;z-index:4}
h1{font-size:70px;line-height:1.55;font-weight:700;letter-spacing:-1.1px}.hero-note{font-size:29px;margin-top:26px;color:#084B37}
.paper{position:absolute;left:1190px;top:195px;width:470px;height:660px;background:#fff;border:1px solid #a9c5b5;overflow:hidden;border-radius:10px}.paper img{width:100%;height:100%;object-fit:cover;object-position:top}.tiny-tag{position:absolute;left:1430px;top:836px;background:#086447;color:#fff;border-radius:30px;padding:8px 24px;font-size:22px;z-index:4}
.scene-title{position:absolute;left:92px;top:117px;font-size:43px;font-weight:700;line-height:1.4;max-width:1400px}.feature-tag{position:absolute;left:94px;top:179px;font-size:23px;color:#086447}
.capabilities{position:absolute;left:105px;top:275px;width:570px}.capability{display:flex;align-items:center;gap:24px;border-top:1px solid #c9ddcf;padding:23px 0;font-size:29px;font-weight:700}.capability span{font-family:LatinFilm,sans-serif;font-size:20px;display:grid;place-items:center;width:54px;height:54px;border-radius:50%;border:1px solid #98b9a5;color:#086447;flex-shrink:0}
.browser{position:absolute;border:1px solid #a7c5b2;border-radius:14px;overflow:hidden;background:#fff}.chrome{position:absolute;top:0;width:100%;height:42px;background:#edf4ee;border-bottom:1px solid #d0e0d3;display:flex;align-items:center;gap:9px;padding:0 20px;color:#084B37;font-size:17px;z-index:1}.chrome i{width:7px;height:7px;border-radius:50%;background:#86a992;display:block}.chrome span{margin-left:20px}.screen{position:absolute;top:42px;left:0;right:0;bottom:0;overflow:hidden}.screen img{width:100%;display:block}
.overview-browser{left:735px;top:228px;width:1080px;height:650px}.overview-browser .screen img{height:100%;object-fit:cover;object-position:top}
.source-paper{position:absolute;left:92px;top:242px;width:416px;height:654px;overflow:hidden;border:1px solid #a7c5b2;border-radius:10px;background:#f8faf7}.source-paper img{width:100%;height:610px;object-fit:contain}.source-label{display:block;height:44px;text-align:center;line-height:44px;font-size:20px;background:#edf4ee;color:#084B37}
.ocr-shell{left:548px;top:242px;width:1280px;height:654px}.video-camera{position:absolute;overflow:hidden;z-index:4;pointer-events:none}.video-camera video{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;display:block}.ocr-camera{left:550px;top:285px;width:1276px;height:608px}
.confirmed-fields{position:absolute;left:552px;top:242px;width:1272px;height:654px;overflow:hidden;border:1px solid #a7c5b2;border-radius:10px;background:white;z-index:8}.confirmed-fields img{width:100%;height:600px;object-fit:contain;object-position:center}.confirmation-label{font-size:24px;font-weight:700;color:#086447;background:#edf4ee;padding:12px 24px;height:54px}
.wait-label{position:absolute;right:115px;top:857px;z-index:12;font-size:18px;color:#084B37;background:#FFFFFF;border:1px solid #a9c5b5;border-radius:30px;padding:8px 18px}
.audit-editor{left:95px;top:245px;width:1090px;height:620px}.audit-editor img{height:100%;object-fit:contain;object-position:center}.audit-words{position:absolute;left:1290px;top:340px;font-size:43px;font-weight:700;line-height:1.8}.audit-proof{position:absolute;left:140px;top:590px;width:1640px;background:#fff;border:1px solid #a7c5b2;border-radius:12px;z-index:5;padding:22px}.audit-proof img{width:100%;display:block}.proof-label{font-size:25px;font-weight:700;margin-bottom:18px;color:#086447}
.area-proof{position:absolute;left:180px;top:232px;width:1560px;height:680px;overflow:hidden;background:#fff}.area-proof img{width:100%;height:100%;object-fit:contain}
.evidence-proof{position:absolute;left:150px;top:228px;width:1620px;height:680px;overflow:hidden;background:#fff;border:1px solid #a7c5b2;border-radius:12px;padding:22px;z-index:7}.evidence-crop{height:608px;overflow:hidden}.evidence-crop img{width:100%;display:block}
.deed-shell{left:130px;top:235px;width:1660px;height:675px}.deed-camera{left:132px;top:278px;width:1656px;height:629px}.deed-camera video{object-fit:cover;object-position:50% 55%}.deed-proof{position:absolute;left:160px;top:235px;width:1600px;height:675px;background:#fff;border:1px solid #a7c5b2;border-radius:12px;padding:22px;overflow:hidden;z-index:8}.deed-proof img{width:100%;height:590px;object-fit:contain;object-position:top}
.citizen-shell{left:88px;top:234px;width:1352px;height:674px}.citizen-camera{left:90px;top:277px;width:1348px;height:629px}.citizen-camera video{object-fit:cover;object-position:50% 48%}.qr-proof{position:absolute;left:1502px;top:245px;width:304px;padding:18px;border:1px solid #a7c5b2;border-radius:12px;background:#fff;text-align:center}.qr-proof img{width:244px;height:244px}.qr-proof p{font-size:20px;margin-top:8px;color:#086447}.print-proof{position:absolute;left:1520px;top:596px;width:274px;height:310px;border:1px solid #a7c5b2;border-radius:10px;overflow:hidden;text-align:center;background:#fff}.print-proof img{width:100%;height:270px;object-fit:cover;object-position:top}.print-proof p{font-size:19px;color:#086447;padding-top:6px}
#closing{background:#086447;color:white}.close-content{position:absolute;inset:190px 80px 190px;display:flex;align-items:center;flex-direction:column;justify-content:center;text-align:center;z-index:2}#closing-brand{font-size:137px;font-weight:700;line-height:1.4}#closing-claim{font-size:43px;margin-top:14px}#closing-caps{font-family:LatinFilm,sans-serif;font-size:25px;letter-spacing:6px;margin-top:33px}#closing-caps span{padding:0 14px;color:#b3d4bf}#closing-url{font-family:LatinFilm,sans-serif;font-size:28px;margin-top:32px;color:#FFFFFF}.close-ring{position:absolute;left:-270px;top:140px;width:850px;height:850px;border:1px solid #4d9879;border-radius:50%}.close-ring.second{left:1410px;top:-180px;width:740px;height:740px}
.subtitle{position:absolute;left:50%;bottom:23px;width:max-content;max-width:1480px;min-height:74px;z-index:100;pointer-events:none;text-align:center;border-radius:10px;background:#1C342B;color:#fff;padding:15px 30px;font-size:30px;line-height:1.47;font-weight:500;translate:-50% 0}
.progress-track{position:absolute;bottom:0;left:0;right:0;height:5px;background:#dce8df;z-index:110}.progress-fill{width:100%;height:100%;background:#086447;transform-origin:0 50%}
'''

motion='''
const tl=gsap.timeline({paused:true});
const reveal=(target,at,extra={})=>tl.fromTo(target,{opacity:0,y:24,...extra},{opacity:1,y:0,x:0,scale:1,duration:.8,ease:'power3.out'},at);
reveal('#hook-copy',.15);tl.fromTo('#paper-one',{x:270,y:90,rotation:9,opacity:0},{x:0,y:0,rotation:4,opacity:1,duration:1.15,ease:'power3.out'},.25);
tl.fromTo('#paper-two',{x:260,y:120,rotation:-10,opacity:0},{x:100,y:35,rotation:-5,opacity:1,duration:1.25,ease:'power3.out'},.55);reveal('#paper-label',1.35);
tl.to('#hook-copy',{x:-35,opacity:0,duration:.42,ease:'power2.in'},6.58);tl.to(['#paper-one','#paper-two','#paper-label'],{x:210,opacity:0,duration:.45,ease:'power2.in'},6.55);
reveal('#overview-browser',7.05,{x:140,scale:.94});['#cap-one','#cap-two','#cap-three','#cap-four'].forEach((s,i)=>reveal(s,7.3+i*.58,{x:-30}));tl.to('#overview-world',{scale:1.045,transformOrigin:'50% 35%',duration:6.1,ease:'none'},8.3);tl.to('#overview-browser',{x:45,opacity:0,duration:.42},14.58);
reveal('#ocr-source',15.05,{x:-90});tl.fromTo('#ocr-camera',{opacity:0,y:20},{opacity:1,y:0,duration:.65,ease:'power3.out'},15.05);tl.set('#ocr-confirmed',{opacity:0},0);tl.fromTo('#ocr-confirmed',{opacity:0,y:25,scale:.97},{opacity:1,y:0,scale:1,duration:.7,ease:'power3.out'},27.1);tl.to('#ocr-camera',{opacity:0,duration:.5},27.1);tl.set('#ocr-camera',{opacity:0},33);
tl.set('#ocr-wait-label',{opacity:0},0);tl.set('#ocr-wait-label',{opacity:1},17.71);tl.set('#ocr-wait-label',{opacity:0},20.32);
reveal('#audit-editor',33.1,{x:-90});reveal('#audit-words',33.5,{x:70});tl.fromTo('#audit-proof',{opacity:0,y:100,scale:.96},{opacity:1,y:0,scale:1,duration:.85,ease:'power3.out'},36.9);tl.to('#audit-words',{opacity:.35,duration:.5},37);
reveal('#area-proof',43.1,{scale:.95});tl.to('#area-proof',{opacity:0,scale:1.04,duration:.6,ease:'power2.inOut'},48.2);tl.set('#evidence-proof',{opacity:0},0);reveal('#evidence-proof',48.35,{y:40,scale:.98});tl.to('#evidence-world',{y:-350,duration:5.3,ease:'power2.inOut'},50.4);
tl.fromTo('#deed-camera',{opacity:0,y:25},{opacity:1,y:0,duration:.65,ease:'power3.out'},57.05);tl.set('#deed-proof',{opacity:0},0);reveal('#deed-proof',64.8,{y:26,scale:.98});tl.to('#deed-camera',{opacity:0,duration:.45},64.8);tl.set('#deed-camera',{opacity:0},70);
tl.set('#deed-wait-label',{opacity:0},0);tl.set('#deed-wait-label',{opacity:1},58.8);tl.set('#deed-wait-label',{opacity:0},61.95);
tl.fromTo('#citizen-camera',{opacity:0,y:20},{opacity:1,y:0,duration:.65,ease:'power3.out'},70.05);reveal('#qr-proof',70.5,{x:80});reveal('#print-proof',77.8,{y:90});tl.to('#citizen-camera',{scale:1.035,transformOrigin:'50% 40%',duration:3,ease:'power2.inOut'},74.8);tl.set('#citizen-camera',{opacity:0},83);
reveal('#closing-brand',83.15,{scale:.94});reveal('#closing-claim',84.35);reveal('#closing-caps',85.3);reveal('#closing-url',86.2);tl.fromTo('#close-ring-one',{x:-100,scale:.9},{x:0,scale:1.05,duration:5.5,ease:'power2.out'},83);tl.fromTo('#close-ring-two',{x:100,scale:1.1},{x:0,scale:1,duration:5.5,ease:'power2.out'},83);
tl.fromTo('.progress-fill',{scaleX:0},{scaleX:1,duration:90,ease:'none'},0);
CAPTION_CODE
tl.to('.ocr-shell .chrome',{opacity:0,duration:.1},27.05);
tl.to('.deed-shell .chrome',{opacity:0,duration:.1},64.75);
window.__timelines['main']=tl;
'''
caption_motion='\n'.join(f"tl.fromTo('#caption-{i}',{{opacity:0}},{{opacity:1,duration:.16,ease:'power2.out'}},{a});tl.to('#caption-{i}',{{opacity:0,duration:.1}},{b-.1});" for i,(a,b,t) in enumerate(captions))
motion=motion.replace('CAPTION_CODE',caption_motion)
page=f'''<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>BhumiSetu · 90 second product demonstration</title><script src="assets/gsap.min.js"></script><style>{css}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="90" data-width="1920" data-height="1080" data-fps="30"><header class="global-header"><div class="brand">{logo}<span>ভূমিসেতু</span></div><div class="header-note">LandTech 2026<span>কাল্পনিক নমুনা তথ্য · বাস্তব অ্যাপ</span></div></header>{content}{caption_markup}<div class="progress-track"><div class="progress-fill"></div></div></div><script>{motion}</script></body></html>'''
(project/'index.html').write_text(page)
print('Built 90-second HyperFrames composition, 8 scene scripts and 19 non-overlapping Bangla captions')
