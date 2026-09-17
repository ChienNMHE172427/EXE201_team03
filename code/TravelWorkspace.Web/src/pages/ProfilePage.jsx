import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProfilePage.css';

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    role: '',
    createdAt: ''
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
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5299/api/User/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5299/api/User/profile', 
        { fullName: profile.fullName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfileMsg({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      
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
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5299/api/User/change-password', 
        { 
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
