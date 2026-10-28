import sys; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts')); from lot import *
import numpy as np, cv2
P=load_paths('disco.svg'); K=1; W=H=1500
m=ink_mask((W,H),P[3][0],K).astype(np.uint8)
# fit ball circle from outer contour
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
c=max(cs,key=cv2.contourArea)[:,0,:]
c=c[c[:,1]>360]   # ignore string
A=np.c_[2*c[:,0],2*c[:,1],np.ones(len(c))]; b=(c**2).sum(1); x=np.linalg.lstsq(A,b,rcond=None)[0]
cx,cy=x[0],x[1]; R=np.sqrt(x[2]+cx*cx+cy*cy); print('circle',cx,cy,R)
yy,xx=np.mgrid[0:H,0:W]; d=np.hypot(xx-cx,yy-cy)
ring=(m>0)&(d>R-40)
string=(m>0)&(yy<cy-R+25)&(d>R-60)
inner=(m>0)&~ring&~string
tiles=cv2.morphologyEx(inner.astype(np.uint8),cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(55,55)))>0
tiles=cv2.dilate(tiles.astype(np.uint8),np.ones((5,5),np.uint8))>0 & inner
rest=inner&~tiles
lat=np.zeros_like(rest)
for ang in range(-24,25,4):
    L=111; h_=55; k=np.zeros((L,L),np.uint8); a=np.radians(ang)
    cv2.line(k,(int(L/2-h_*np.cos(a)),int(L/2-h_*np.sin(a))),(int(L/2+h_*np.cos(a)),int(L/2+h_*np.sin(a))),1,1)
    lat|=cv2.morphologyEx(rest.astype(np.uint8),cv2.MORPH_OPEN,k)>0
lat=cv2.dilate(lat.astype(np.uint8),np.ones((15,15),np.uint8))>0 & rest
mer=rest&~lat
np.savez_compressed('split.npz',ring=ring,string=string,tiles=tiles,lat=lat,mer=mer,circ=np.array([cx,cy,R]))
vis=np.full((H,W,3),255,np.uint8); vis[ring]=(0,0,0); vis[string]=(120,120,120); vis[tiles]=(0,160,0); vis[lat]=(200,0,0); vis[mer]=(0,0,220)
cv2.imwrite('split.png',vis)
n,lab=cv2.connectedComponents(mer.astype(np.uint8)); print('meridian comps',n-1, sorted(np.bincount(lab.ravel())[1:])[:15])
