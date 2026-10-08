import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './ProfilePage.css';

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    role: '',
    createdAt: '',
    avatarUrl: ''
  });
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/User/profile');
      setProfile(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const getAvatarUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5300/api').replace(/\/api\/?$/, '');
    return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Kiểm tra dung lượng < 5MB
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh nhỏ hơn 5MB.');
      return;
    }

    // Kiểm tra định dạng ảnh
    const validExtensions = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validExtensions.includes(selectedFile.type)) {
      alert('Chỉ chấp nhận các định dạng ảnh: .jpg, .jpeg, .png.');
      return;
    }

    // Đóng gói file vào FormData để gửi multipart/form-data
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setProfileMsg({ type: 'info', text: 'Đang tải ảnh đại diện lên máy chủ...' });

      const response = await api.post('/User/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const newAvatarUrl = response.data.avatarUrl;
      setProfile(prev => ({ ...prev, avatarUrl: newAvatarUrl }));

      // Cập nhật thông tin trong LocalStorage và kích hoạt sự kiện cho Sidebar
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.avatarUrl = newAvatarUrl;
      localStorage.setItem('user', JSON.stringify(storedUser));
      window.dispatchEvent(new Event('profileUpdated'));

      setProfileMsg({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
      setTimeout(() => setProfileMsg({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Lỗi khi tải ảnh đại diện:', error);
      setProfileMsg({ 
        type: 'error', 
        text: error.response?.data?.message || 'Có lỗi xảy ra khi tải ảnh đại diện.' 
      });
    }
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put('/User/profile', { fullName: profile.fullName, avatarUrl: profile.avatarUrl });
      setProfileMsg({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      
      // Update local storage and dispatch event so Sidebar updates
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.name = profile.fullName;
      storedUser.avatarUrl = profile.avatarUrl;
      localStorage.setItem('user', JSON.stringify(storedUser));
      window.dispatchEvent(new Event('profileUpdated'));

      // Clear message after 3 seconds
      setTimeout(() => setProfileMsg({ type: '', text: '' }), 3000);
    } catch (error) {
      setProfileMsg({ type: 'error', text: 'Có lỗi xảy ra khi cập nhật.' });
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
      return;
    }
    if (passwords.newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }

    try {
      await api.post('/User/change-password', { 
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      setTimeout(() => setPasswordMsg({ type: '', text: '' }), 3000);
    } catch (error) {
      setPasswordMsg({ 
        type: 'error', 
        text: error.response?.data || 'Sai mật khẩu hiện tại hoặc có lỗi xảy ra.' 
      });
    }
  };

  if (loading) return <div style={{padding: '30px'}}>Đang tải thông tin...</div>;

  return (
    <div className="profile-container">
      <h2>Hồ sơ cá nhân</h2>

      <div className="profile-card">
        <h3 className="profile-section-title">Thông tin chung</h3>
        {profileMsg.text && (
          <div className={`alert-message alert-${profileMsg.type}`}>
            {profileMsg.text}
          </div>
        )}
        
        <form onSubmit={updateProfile}>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            {profile.avatarUrl ? (
              <img src={getAvatarUrl(profile.avatarUrl)} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#005f56', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                {profile.fullName ? profile.fullName.substring(0, 2).toUpperCase() : 'ME'}
              </div>
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>Ảnh đại diện</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange} 
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '-4px' }}>Hoặc dùng link ảnh:</div>
              <input 
                type="text" 
                name="avatarUrl" 
                value={profile.avatarUrl} 
                onChange={handleProfileChange} 
                placeholder="Nhập đường dẫn hình ảnh (URL)..."
              />
            </div>
          </div>
          <div className="form-group">
            <label>Email (Không thể thay đổi)</label>
            <input type="email" value={profile.email} disabled />
          </div>
          <div className="form-group">
            <label>Tên hiển thị</label>
            <input 
              type="text" 
              name="fullName" 
              value={profile.fullName} 
              onChange={handleProfileChange} 
              required
            />
          </div>
          <div className="form-group">
            <label>Vai trò</label>
            <input type="text" value={profile.role} disabled />
          </div>
          <div className="form-group">
            <label>Ngày tham gia</label>
            <input type="text" value={new Date(profile.createdAt).toLocaleDateString('vi-VN')} disabled />
          </div>
          <button type="submit" className="btn-save">Lưu thay đổi</button>
        </form>
      </div>

      <div className="profile-card">
        <h3 className="profile-section-title">Đổi mật khẩu</h3>
        {passwordMsg.text && (
          <div className={`alert-message alert-${passwordMsg.type}`}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={changePassword}>
          <div className="form-group">
            <label>Mật khẩu hiện tại</label>
            <input 
              type="password" 
              name="currentPassword"
              value={passwords.currentPassword}
              onChange={handlePasswordChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Mật khẩu mới</label>
            <input 
              type="password" 
              name="newPassword"
              value={passwords.newPassword}
              onChange={handlePasswordChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Xác nhận mật khẩu mới</label>
            <input 
              type="password" 
              name="confirmPassword"
              value={passwords.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
          </div>
          <button type="submit" className="btn-save">Cập nhật mật khẩu</button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
