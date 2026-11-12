import sys; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts')); from lot import *
import cv2, numpy as np
P=load_paths('mail.svg'); K=2
m=ink_mask((1500,1500),P[0][0],K)
CX,CY,R=1149.0,848.0,211.0
yy,xx=np.mgrid[0:m.shape[0],0:m.shape[1]]/K
d=np.hypot(xx-CX,yy-CY)
# the badge ring takes its whole chalk band (incl. where the envelope's lines cross into it)
ring=m&(d>R-40)&(d<R+45)
n,lab,st,_=cv2.connectedComponentsWithStats(ring.astype(np.uint8)); ring=lab==(1+np.argmax(st[1:,cv2.CC_STAT_AREA]))
env=m&~ring
# the envelope's two edges are rebuilt from just outside the band, on their measured lines, through to the
# corner hidden under the badge (chalky edge, same width as the drawing's lines)
rng=np.random.default_rng(3); reb=np.zeros(m.shape,np.uint8)
for (ax,ay),(bx,by) in (((1122,566),(1245,966)),((955,1042),(1245,966))):
    L=int(np.hypot(bx-ax,by-ay))
    for s in range(0,L,3):
        u=s/L; cv2.circle(reb,(int((ax+(bx-ax)*u)*K),int((ay+(by-ay)*u)*K)),int((11.5+rng.uniform(-1.2,1.2))*K),1,-1)
env=env|(reb>0)
n,lab,st,_=cv2.connectedComponentsWithStats(env.astype(np.uint8))
for i in range(1,n):                       # stray rim bits of the ring that ended up in the envelope
    isl=lab==i
    if st[i,cv2.CC_STAT_AREA]<2500*K*K and (np.abs(d[isl]-R)<60).all(): env[isl]=False; ring|=isl
# matte: the inside of the ring, reaching into the middle of its band (lines end under the ring's ink)
cs,_=cv2.findContours(ring.astype(np.uint8),cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
inner=np.zeros(m.shape,np.uint8)
big=[c for c in cs if cv2.contourArea(c)>0]; big.sort(key=cv2.contourArea)
inner_c=[c for c in big if cv2.pointPolygonTest(c,(CX*K,CY*K),False)>0]
cv2.drawContours(inner,[inner_c[0]],-1,1,-1)          # the smallest contour around the centre = inner edge
disc=cv2.dilate(inner,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(17*K,17*K)))>0
np.savez_compressed('split.npz',ring=ring,env=env,disc=disc)
vis=np.full(m.shape+(3,),255,np.uint8); vis[disc]=(235,235,255); vis[env]=(0,150,0); vis[ring]=(0,0,200)
cv2.imwrite('split.png',cv2.resize(vis[900:2300,1700:2800],(550,700)))
