import sys; sys.path.insert(0, __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'scripts')); from lot import *
import numpy as np, cv2
P=load_paths('coffee.svg'); K=2; W,H=1400,1300
m=ink_mask((W,H),P[1][0],K)
cs,h=cv2.findContours(m.astype(np.uint8),cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
cro_fill=np.zeros(m.shape,np.uint8)
for i,c in enumerate(cs):
    if h[0][i][3]>=0:
        x,y,w,hh=cv2.boundingRect(c)
        if x//K>=700 and y//K>=850: cv2.drawContours(cro_fill,[c],-1,1,-1)
R=int(26*K)
cro_reg=cv2.dilate(cro_fill,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*R+1,2*R+1)))>0
cro=m&cro_reg
yy=np.arange(m.shape[0])[:,None]
xx=np.arange(m.shape[1])[None,:]
lid=m&~cro&(yy<458*K)&~((xx>800*K)&(yy>=445*K))
cup=m&~cro&~lid
# croissant silhouette (filled outline) for the occlusion matte
sil=cv2.morphologyEx((cro|(cro_fill>0)).astype(np.uint8),cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))
cs2,_=cv2.findContours(sil,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
silf=np.zeros_like(sil); cv2.drawContours(silf,cs2,-1,1,-1)
np.savez_compressed('split.npz',cro=cro,lid=lid,cup=cup,sil=silf>0)
vis=np.full(m.shape+(3,),255,np.uint8); vis[silf>0]=(230,230,255); vis[cup]=(0,0,0); vis[lid]=(200,0,0); vis[cro]=(0,150,0)
cv2.imwrite('split.png',cv2.resize(vis,(1400,1300)))
